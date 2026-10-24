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
