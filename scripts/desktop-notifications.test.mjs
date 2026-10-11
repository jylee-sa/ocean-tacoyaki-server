import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import vm from 'node:vm'
import { createDesktopNotifications } from '../webdist/assets/desktop-notifications.js'

function makeWindow() {
  const listeners = new Map()
  const documentListeners = new Map()
  let focused = false
  return {
    closed: false,
    isSecureContext: true,
    document: { hidden: false, hasFocus: () => focused,
      addEventListener: (name, handler) => documentListeners.set(name, handler),
      removeEventListener: (name) => documentListeners.delete(name) },
    addEventListener: (name, handler) => listeners.set(name, handler),
    removeEventListener: (name) => listeners.delete(name),
    focus() { focused = true; listeners.get('focus')?.() },
    blur() { focused = false },
    setFocus(value) { focused = value }
  }
}

function fixture(t) {
  let now = 0
  t.mock.method(Date, 'now', () => now)
  const host = makeWindow()
  const notifications = []
  let permissionRequests = 0
  let enabled = true
  let context = { roomId: 'room', roomTitle: '밤의 도서관', status: 'connected', self: { playerId: 'self' } }
  class NotificationAPI {
    static permission = 'granted'
    static async requestPermission() { permissionRequests++; return 'granted' }
    constructor(title, options) { this.title = title; this.options = options; this.closed = false; notifications.push(this) }
    close() { this.closed = true; this.onclose?.() }
  }
  host.Notification = NotificationAPI
  const controller = createDesktopNotifications({ window: host, getContext: () => context, getEnabled: () => enabled })
  const message = (id = 'message') => ({ id, playerId: 'other', kind: 'speech', channel: 'ooc', text: '본문' })
  return { host, controller, notifications, NotificationAPI, message,
    context: () => context,
    setContext: (value) => { context = { ...context, ...value } },
    setEnabled: (value) => { enabled = value },
    permissionRequests: () => permissionRequests,
    advance: (milliseconds) => { now += milliseconds } }
}

test('background messages show a generic notification without exposing session or chat content', (t) => {
  const f = fixture(t)
  assert.equal(f.controller.receive(f.message()), true)
  assert.equal(f.notifications[0].title, '타코야키 박스')
  assert.equal(f.notifications[0].options.body, '새로운 메시지가 도착했습니다.')
  assert.equal(f.notifications[0].options.tag, 'tacoyaki-session:room')
  assert.equal(f.notifications[0].options.silent, true)
  assert.ok(!f.notifications[0].options.body.includes('본문'))
})

test('focused main and popup windows suppress PC notifications', (t) => {
  const f = fixture(t)
  f.host.setFocus(true)
  assert.equal(f.controller.receive(f.message('main-focused')), false)
  f.host.blur()
  const popup = makeWindow()
  popup.setFocus(true)
  const unregister = f.controller.registerWindow(popup)
  assert.equal(f.controller.receive(f.message('popup-focused')), false)
  popup.closed = true
  popup.document = null
  assert.doesNotThrow(unregister)
  assert.equal(f.controller.receive(f.message('background')), true)
})

test('own messages and system messages never generate PC notifications', (t) => {
  const f = fixture(t)
  assert.equal(f.controller.receive({ ...f.message(), playerId: 'self' }), false)
  assert.equal(f.controller.receive({ ...f.message('system'), kind: 'system' }), false)
  assert.equal(f.controller.receive({ ...f.message('anonymous'), playerId: undefined }), false)
  assert.equal(f.notifications.length, 0)
})

test('disabled settings and ungranted permissions are silent and never prompt on arrival', (t) => {
  const f = fixture(t)
  f.setEnabled(false)
  assert.equal(f.controller.receive(f.message('disabled')), false)
  f.setEnabled(true)
  for (const permission of ['default', 'denied']) {
    f.NotificationAPI.permission = permission
    assert.equal(f.controller.receive(f.message(permission)), false)
  }
  assert.equal(f.permissionRequests(), 0)
  assert.equal(f.notifications.length, 0)
})

test('permission is requested only by the explicit enable action', async (t) => {
  const f = fixture(t)
  f.NotificationAPI.permission = 'default'
  assert.equal(await f.controller.requestPermission(), 'granted')
  assert.equal(f.permissionRequests(), 1)
  f.NotificationAPI.permission = 'denied'
  assert.equal(await f.controller.requestPermission(), 'denied')
  assert.equal(f.permissionRequests(), 1)
})

test('unsupported or insecure browsers fail without affecting chat', async (t) => {
  const f = fixture(t)
  f.host.isSecureContext = false
  assert.equal(await f.controller.requestPermission(), 'unsupported')
  assert.equal(f.controller.receive(f.message()), false)
  assert.equal(f.permissionRequests(), 0)
})

test('duplicate events and message bursts do not create notification floods', (t) => {
  const f = fixture(t)
  assert.equal(f.controller.receive(f.message()), true)
  assert.equal(f.controller.receive(f.message('burst')), false)
  f.advance(4000)
  assert.equal(f.controller.receive(f.message()), false)
  assert.equal(f.controller.receive(f.message('next')), true)
  assert.equal(f.notifications.length, 2)
  assert.equal(f.notifications[0].closed, true)
})

test('returning focus closes the notification and clicking it focuses the current session', (t) => {
  const f = fixture(t)
  f.controller.receive(f.message())
  f.notifications[0].onclick()
  assert.equal(f.host.document.hasFocus(), true)
  assert.equal(f.notifications[0].closed, true)
  f.host.blur()
  f.advance(4000)
  f.controller.receive(f.message('next'))
  f.host.focus()
  assert.equal(f.notifications[1].closed, true)
})

test('leaving a session closes its notification and idle connections cannot notify', (t) => {
  const f = fixture(t)
  f.controller.receive(f.message())
  f.controller.reset()
  assert.equal(f.notifications[0].closed, true)
  f.setContext({ roomId: null, status: 'idle' })
  assert.equal(f.controller.receive(f.message('idle')), false)
  assert.equal(f.notifications.length, 1)
})

test('a stale notification cannot focus a different session or close its new notification', (t) => {
  const f = fixture(t)
  f.controller.receive(f.message())
  f.setContext({ roomId: 'other-room', roomTitle: '새 세션' })
  f.controller.receive(f.message('new-room'))
  f.notifications[0].onclick()
  assert.equal(f.host.document.hasFocus(), false)
  assert.equal(f.notifications[1].closed, false)
  assert.equal(f.notifications[1].options.body, '새로운 메시지가 도착했습니다.')
})

test('Notification constructor failure does not interrupt message processing', (t) => {
  const f = fixture(t)
  t.mock.method(console, 'warn', () => {})
  const throwingHost = makeWindow()
  throwingHost.Notification = class {
    static permission = 'granted'
    constructor() { throw new Error('OS notifications unavailable') }
  }
  const controller = createDesktopNotifications({ window: throwingHost, getContext: f.context, getEnabled: () => true })
  assert.equal(controller.receive(f.message()), false)
})

test('the actual socket handler adds the chat message and routes it to desktop notifications', async (t) => {
  const f = fixture(t)
  const bundle = await readFile(new URL('../webdist/assets/index-DnAfYmnE.js', import.meta.url), 'utf8')
  const start = bundle.indexOf('e.on("chat:new",')
  const end = bundle.indexOf(',e.on("chat:edited"', start)
  assert.ok(start >= 0 && end > start)
  let handler
  const received = []
  vm.runInNewContext(bundle.slice(start, end), {
    e: { on: (_event, fn) => { handler = fn } },
    oe: { getState: () => ({ addRemote: (message) => received.push(message) }) },
    Df: (message) => message,
    q: { getState: f.context },
    document: f.host.document,
    desktopNotifications: f.controller,
    Ee: () => {}
  })
  handler(f.message())
  assert.equal(received.length, 1)
  assert.equal(f.notifications.length, 1)
})

test('the settings button enables only after permission and can disable without asking again', async (t) => {
  const f = fixture(t)
  f.NotificationAPI.permission = 'default'
  const settings = await readFile(new URL('../webdist/assets/Settings-NM2r0Qu_.js', import.meta.url), 'utf8')
  const start = settings.indexOf('onClick:async()=>{if(pcNotificationsOn)')
  const end = settings.indexOf(',children:pcNotificationsOn', start)
  assert.ok(start >= 0 && end > start)
  const state = { pcNotificationsOn: false, desktopNotifications: f.controller,
    setPcNotifications: (enabled) => { state.pcNotificationsOn = enabled }, h: async () => {} }
  const onClick = vm.runInNewContext('({' + settings.slice(start, end) + '}).onClick', state)
  await onClick()
  assert.equal(state.pcNotificationsOn, true)
  assert.equal(f.permissionRequests(), 1)
  await onClick()
  assert.equal(state.pcNotificationsOn, false)
  assert.equal(f.permissionRequests(), 1)
})
