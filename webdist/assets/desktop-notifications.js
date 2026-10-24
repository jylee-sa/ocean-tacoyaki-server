const MAX_RECENT_MESSAGES = 200
const NOTIFICATION_INTERVAL_MS = 4000
const APP_TITLE = '타코야키 박스'

export function createDesktopNotifications({ getContext, getEnabled, window: host = globalThis.window }) {
  const NotificationAPI = host?.Notification
  const windows = new Map()
  const seen = new Set()
  let currentRoomId = null
  let notification = null
  let lastShownAt = null

  function supported() {
    return Boolean(host?.isSecureContext && typeof NotificationAPI === 'function')
  }

  function close() {
    try { notification?.close() } catch {}
    notification = null
  }

  function focused() {
    for (const win of windows.keys()) {
      try {
        if (!win.closed && !win.document.hidden && win.document.hasFocus()) return true
      } catch {}
    }
    return false
  }

  function registerWindow(win) {
    if (windows.has(win)) return windows.get(win)
    const doc = win.document
    const onFocus = () => { if (focused()) close() }
    const unregister = () => {
      windows.delete(win)
      win.removeEventListener('focus', onFocus)
      doc.removeEventListener('visibilitychange', onFocus)
    }
    windows.set(win, unregister)
    win.addEventListener('focus', onFocus)
    doc.addEventListener('visibilitychange', onFocus)
    onFocus()
    return unregister
  }

  function reset() {
    close()
    seen.clear()
    currentRoomId = null
    lastShownAt = null
  }

  async function requestPermission() {
    if (!supported()) return 'unsupported'
    if (NotificationAPI.permission !== 'default') return NotificationAPI.permission
    try { return await NotificationAPI.requestPermission() } catch { return 'error' }
  }

  function receive(message) {
    const context = getContext()
    if (context.status !== 'connected' || !context.roomId || !context.self?.playerId || !message?.id) return false
    if (currentRoomId !== context.roomId) {
      reset()
      currentRoomId = context.roomId
    }
    if (seen.has(message.id)) return false
    seen.add(message.id)
    if (seen.size > MAX_RECENT_MESSAGES) seen.delete(seen.values().next().value)
    if (!getEnabled() || !supported() || NotificationAPI.permission !== 'granted' || focused()) return false
    if (!message.playerId || message.playerId === context.self.playerId || message.kind === 'system') return false
    const now = Date.now()
    if (lastShownAt !== null && now - lastShownAt < NOTIFICATION_INTERVAL_MS) return false

    try {
      close()
      const roomId = context.roomId
      const title = typeof context.roomTitle === 'string' ? context.roomTitle.trim() : ''
      const item = new NotificationAPI(title || APP_TITLE, {
        body: '새로운 메시지가 도착했습니다.',
        tag: `tacoyaki-session:${roomId}`,
        silent: true
      })
      notification = item
      lastShownAt = now
      item.onclick = () => {
        if (getContext().roomId === roomId) {
          try { host.focus() } catch {}
        }
        if (notification === item) close()
        else item.close()
      }
      item.onclose = () => { if (notification === item) notification = null }
      return true
    } catch (error) {
      console.warn('🔔 PC 알림을 표시하지 못했습니다:', error)
      return false
    }
  }

  if (host) registerWindow(host)
  return { supported, requestPermission, receive, registerWindow, reset }
}
