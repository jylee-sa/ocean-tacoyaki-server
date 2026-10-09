(() => {
  const IDLE_MS = 2000
  const PULSE_MS = 500
  const SOCKET_POLL_MS = 250
  const active = new Map()
  const observedFields = new WeakSet()
  const observedDocuments = new WeakSet()
  let socket

  function key(request) {
    return JSON.stringify([request.channel || 'main', request.groupId || ''])
  }

  function send(request, typing) {
    if (socket?.connected) socket.emit('chat:typing', { ...request, typing })
  }

  function stop(source, notify = true) {
    const state = active.get(source)
    if (!state) return
    clearTimeout(state.timer)
    active.delete(source)
    if (notify && ![...active.values()].some((other) => key(other.request) === key(state.request))) {
      send(state.request, false)
    }
  }

  function stopWhere(predicate, notify = true) {
    for (const [source, state] of active) {
      if (predicate(state)) stop(source, notify)
    }
  }

  function observe(field) {
    if (!observedFields.has(field)) {
      observedFields.add(field)
      field.addEventListener('blur', () => stopWhere((state) => state.field === field))
    }
    const doc = field.ownerDocument
    if (observedDocuments.has(doc)) return
    observedDocuments.add(doc)
    const stopDocument = () => stopWhere((state) => state.field.ownerDocument === doc)
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) stopDocument()
    })
    doc.defaultView?.addEventListener('pagehide', stopDocument)
    doc.defaultView?.addEventListener('blur', stopDocument)
  }

  function install() {
    const next = window.tacoyakiHost?.host?.net?.getSocket?.()
    if (next === socket) return
    stopWhere(() => true)
    socket = next
    if (!socket) return
    const installedSocket = socket
    const reset = () => {
      if (socket === installedSocket) stopWhere(() => true, false)
    }
    socket.on('disconnect', reset)
    socket.on('room:closed', reset)
  }

  function input(source, field, request) {
    install()
    const doc = field?.ownerDocument
    const previous = active.get(source)
    if (previous && key(previous.request) !== key(request)) stop(source)
    if (!field?.isConnected || doc?.activeElement !== field || !field.value.trim() ||
      doc.hidden || !socket?.connected) {
      stop(source)
      return
    }
    observe(field)
    const current = active.get(source)
    if (current) clearTimeout(current.timer)
    const now = Date.now()
    const state = { request, field, lastSent: current?.lastSent ?? -Infinity }
    if (now - state.lastSent >= PULSE_MS) {
      send(request, true)
      state.lastSent = now
    }
    state.timer = setTimeout(() => stop(source), IDLE_MS)
    active.set(source, state)
  }

  window.tabakTypingPresence = { input, stop }
  setInterval(install, SOCKET_POLL_MS)
})()
