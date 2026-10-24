export function vnSpeakerKey(message) {
  return JSON.stringify([message.playerId ?? '', message.author ?? message.id])
}

export function isVnStandingHidden(message, hidden = {}, messages = []) {
  if (!message) return false
  const hiddenId = hidden[vnSpeakerKey(message)]
  if (!hiddenId) return false
  if (hiddenId === message.id) return true
  const hiddenIndex = messages.findIndex((entry) => entry.id === hiddenId)
  const messageIndex = messages.findIndex((entry) => entry.id === message.id)
  return messageIndex >= 0 && hiddenIndex > messageIndex
}

export function resolveVnStanding(message, { roster = {}, charPool = {}, characters = {}, self } = {}) {
  if (!message || message.npc) return null
  if (message.standing === null) return null
  const snapshot = message.standing ? {
    src: message.standing, height: message.standingHeight, name: message.author || ''
  } : null

  const current = message.playerId ? roster[message.playerId] : undefined
  const matches = (character) => message.charId
    ? character.charId === message.charId
    : Boolean(message.author && character.name === message.author)
  const identity = current && (matches(current) || !message.author && !message.charId)
    ? current
    : Object.values(charPool).find((character) => character.playerId === message.playerId && matches(character))
  const local = !identity && (!self || self.playerId === message.playerId)
    ? Object.values(characters).find((character) => message.charId
      ? character.id === message.charId
      : Boolean(message.author && character.info.name === message.author))
    : undefined
  const portrait = identity ?? (local ? { ...local.portrait, name: local.info.name, visibility: local.visibility } : undefined)
  if (!portrait) return snapshot
  if (portrait.visibility === 'hidden') return null
  const images = portrait.standings ?? []
  const index = Math.max(0, Math.min(portrait.currentExpression ?? 0, images.length - 1))
  const src = images[index]
  return src ? { src, height: portrait.standingHeight, name: message.author || portrait.name || '' } : snapshot
}

export function updateVnExpression(state, playerId, index, charId) {
  const current = state.roster[playerId]
  if (!current || !Number.isFinite(index) || charId !== undefined && current.charId !== charId) return {}
  const max = Math.max(0, (current.standings?.length ?? 0) - 1)
  const next = { ...current, currentExpression: Math.max(0, Math.min(Math.trunc(index), max)) }
  const key = current.charId ? `${playerId.length}:${playerId}${current.charId}` : undefined
  return {
    roster: { ...state.roster, [playerId]: next },
    ...(key ? { charPool: { ...state.charPool, [key]: next } } : {})
  }
}
