(() => {
  const IDLE_MS = 1200
  const INPUT_SELECTOR = 'textarea[data-chat-input]'
  let rawEmit
  let lastChannel = 'main'
  let lastGroupId
  let stopTimer

  function input() {
    return document.querySelector(INPUT_SELECTOR)
  }

  function clearStopTimer() {
    if (!stopTimer) return
    clearTimeout(stopTimer)
    stopTimer = undefined
  }

  function payload(typing) {
    return {
      typing,
      channel: lastChannel,
      ...(lastChannel === 'group' && lastGroupId ? { groupId: lastGroupId } : {})
    }
  }

  function stopTyping() {
    clearStopTimer()
    rawEmit?.('chat:typing', payload(false))
  }

  function renewStopTimer() {
    clearStopTimer()
    stopTimer = setTimeout(stopTyping, IDLE_MS)
  }

  function pulseTyping() {
    const field = input()
    if (!field?.value.trim()) {
      stopTyping()
      return
    }
    rawEmit?.('chat:typing', payload(true))
    renewStopTimer()
  }

  function rememberChannel(request) {
    const channel = request?.channel
    if (channel === 'main' || channel === 'ooc' || channel === 'whisper' || channel === 'group') {
      lastChannel = channel
      lastGroupId = channel === 'group' && typeof request.groupId === 'string' ? request.groupId : undefined
    }
  }

  function install() {
    const socket = window.tacoyakiHost?.host?.net?.getSocket?.()
    if (!socket || socket.__tabakTypingPresence) return Boolean(socket)

    rawEmit = socket.emit.bind(socket)
    socket.emit = (event, request, ...rest) => {
      if (event !== 'chat:typing') return rawEmit(event, request, ...rest)
      rememberChannel(request)
      if (request?.typing === true && !input()?.value.trim()) {
        return rawEmit(event, payload(false), ...rest)
      }
      if (request?.typing === true) renewStopTimer()
      else clearStopTimer()
      return rawEmit(event, request, ...rest)
    }
    socket.__tabakTypingPresence = true
    return true
  }

  const socketWait = setInterval(() => {
    if (!install()) return
    clearInterval(socketWait)
  }, 250)

  document.addEventListener(
    'input',
    (event) => {
      if (event.target?.matches?.(INPUT_SELECTOR)) setTimeout(pulseTyping, 0)
    },
    true
  )
  document.addEventListener(
    'compositionend',
    (event) => {
      if (event.target?.matches?.(INPUT_SELECTOR)) setTimeout(pulseTyping, 0)
    },
    true
  )
  document.addEventListener(
    'focusout',
    (event) => {
      if (event.target?.matches?.(INPUT_SELECTOR)) stopTyping()
    },
    true
  )
})()
