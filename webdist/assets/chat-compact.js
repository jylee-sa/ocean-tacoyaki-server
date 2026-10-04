(() => {
  const MAX_LUCK_CARD_COST = 10

  function isContinuation(previous, current) {
    if (!previous?.matches('.msg') || !current?.matches('.msg')) return false
    if (!previous.querySelector(':scope > .body > .txt') || !current.querySelector(':scope > .body > .txt')) return false
    const previousName = previous.querySelector('.who > span')?.textContent
    const currentName = current.querySelector('.who > span')?.textContent
    return Boolean(previousName && currentName && previousName === currentName)
  }

  function assignMessageLabelClasses(message) {
    const labels = [...message.querySelectorAll(':scope > .body > .who > span')]
    const author = labels[0]
    const time = labels.at(-1)
    author?.classList.add('msg-author')
    if (time && time !== author) time.classList.add('msg-time')
  }

  function applyCompactMessages(log) {
    const messages = [...log.querySelectorAll(':scope > .msg, :scope > .msg-script')]
    for (let index = 0; index < messages.length; index += 1) {
      const current = messages[index]
      if (!current.matches('.msg')) continue
      assignMessageLabelClasses(current)
      current.classList.toggle('msg-cont', isContinuation(messages[index - 1], current))
    }
  }

  function previousMessage(message) {
    let previous = message.previousElementSibling
    while (previous && !previous.matches('.msg, .msg-script')) previous = previous.previousElementSibling
    return previous
  }

  function applyCompactMessage(current) {
    if (!current.matches('.msg')) return
    assignMessageLabelClasses(current)
    current.classList.toggle('msg-cont', isContinuation(previousMessage(current), current))
  }

  function applyLuckLimit() {
    document.querySelectorAll('.luck-card').forEach((card) => {
      const cost = Number(card.querySelector('.luck-card-sub b')?.textContent?.trim())
      if (!Number.isFinite(cost) || cost > MAX_LUCK_CARD_COST) {
        if (card.style.display !== 'none' || card.style.getPropertyPriority('display') !== 'important') {
          card.style.setProperty('display', 'none', 'important')
        }
      } else if (card.style.display === 'none') {
        card.style.removeProperty('display')
      }
    })
  }

  function renameDecorReset() {
    document.querySelectorAll('.cin-opts > button[title^="스크립트·꾸미기를"]').forEach((button) => {
      button.title = '채팅 꾸미기 모두 해제'
      for (const node of button.childNodes) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('스크립트 해제')) {
          node.textContent = ' 꾸미기 해제'
        }
      }
    })
  }

  const observedLogs = new WeakSet()

  function observeChatLog(log) {
    if (observedLogs.has(log)) return
    observedLogs.add(log)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement) || !node.matches('.msg, .msg-script')) continue
          applyCompactMessage(node)
          applyLuckLimit(node)
        }
      }
    })
    observer.observe(log, { childList: true })
    applyCompactMessages(log)
  }

  function observeChatLogs() {
    document.querySelectorAll('.log').forEach(observeChatLog)
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof HTMLElement)) continue
          if (node.matches('.log')) observeChatLog(node)
          node.querySelectorAll('.log').forEach(observeChatLog)
        }
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
  }

  observeChatLogs()
  applyLuckLimit()
  renameDecorReset()
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const card = target.closest('.luck-card')
      if (!card) return
      const cost = Number(card.querySelector('.luck-card-sub b')?.textContent?.trim())
      if (Number.isFinite(cost) && cost <= MAX_LUCK_CARD_COST) return
      event.preventDefault()
      event.stopImmediatePropagation()
    },
    true
  )
  document.addEventListener('click', () => requestAnimationFrame(renameDecorReset))
})()
