(() => {
  const DEFAULT_VOLUME = 0.2
  const LEGACY_DEFAULT_VOLUME = 0.1
  const CLIENT_ENTRY_URL = '/assets/index-DnAfYmnE.js'

  function installSocketDefault() {
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

  async function installStoreDefault() {
    const entry = await import(CLIENT_ENTRY_URL)
    const store = Object.values(entry).find((candidate) => {
      const state = candidate?.getState?.()
      return state && typeof state.addYouTube === 'function' && typeof state.playTrack === 'function'
    })
    if (!store || store.__tabakBgmDefaultVolume) return Boolean(store)

    const { addFiles, addYouTube, playTrack } = store.getState()
    const applyLibraryDefaults = () => {
      const { library, setLibraryVolume } = store.getState()
      for (const track of library) {
        if (track.volume == null) setLibraryVolume(track.id, DEFAULT_VOLUME)
      }
    }

    store.setState({
      async addFiles(...args) {
        const result = await addFiles(...args)
        applyLibraryDefaults()
        return result
      },
      addYouTube(...args) {
        const result = addYouTube(...args)
        if (result?.ok) applyLibraryDefaults()
        return result
      },
      playTrack(track) {
        playTrack(track?.volume == null ? { ...track, volume: DEFAULT_VOLUME } : track)
      }
    })
    applyLibraryDefaults()
    store.__tabakBgmDefaultVolume = true
    return true
  }

  let socketReady = false
  let storeReady = false
  let storePending = false
  const waitForBgm = setInterval(async () => {
    socketReady ||= installSocketDefault()
    if (!storeReady && !storePending) {
      storePending = true
      try {
        storeReady = await installStoreDefault()
      } catch (error) {
        console.error('🔊 BGM 기본 음량 설정을 적용하지 못했습니다.', error)
        clearInterval(waitForBgm)
      } finally {
        storePending = false
      }
    }
    if (socketReady && storeReady) clearInterval(waitForBgm)
  }, 250)
})()
