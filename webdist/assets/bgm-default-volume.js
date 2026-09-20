(() => {
  const DEFAULT_VOLUME = 0.2
  const LEGACY_DEFAULT_VOLUME = 0.1

  function install() {
    const socket = window.tacoyakiHost?.host?.net?.getSocket?.()
    if (!socket || socket.__tabakBgmDefaultVolume) return Boolean(socket)

    const emit = socket.emit.bind(socket)
    socket.emit = (event, request, ...rest) => {
      if (event === 'bgm:set' && request?.volume === LEGACY_DEFAULT_VOLUME) {
        request = { ...request, volume: DEFAULT_VOLUME }
      }
      return emit(event, request, ...rest)
    }
    socket.__tabakBgmDefaultVolume = true
    return true
  }

  const waitForSocket = setInterval(() => {
    if (!install()) return
    clearInterval(waitForSocket)
  }, 250)
})()
