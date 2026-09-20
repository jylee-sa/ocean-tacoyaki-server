(() => {
  const MAX_LUCK_CARD_COST = 10

  function setContinuationTime(message, time) {
    if (!message) return
    const existing = message.querySelector(':scope > .body > .tabak-cont-time')
    if (!time) {
      existing?.remove()
      return
    }
    if (existing) {
      if (existing.textContent !== time) existing.textContent = time
      return
    }
    const text = message.querySelector(':scope > .body > .txt')
    if (!text) return
    const label = document.createElement('div')
    label.className = 'tabak-cont-time'
    label.textContent = time
    text.before(label)
  }

  function applyCompactMessages() {
    const messages = [...document.querySelectorAll('.log > .msg, .log > .msg-script')]
    messages[0]?.classList.remove('msg-cont')
    setContinuationTime(messages[0], '')

    for (let index = 1; index < messages.length; index += 1) {
      const previous = messages[index - 1]
      const current = messages[index]
      const previousName = previous.querySelector('.who > span')?.textContent
      const currentName = current.querySelector('.who > span')?.textContent
      const previousTime = previous.querySelector('.who > span:last-child')?.textContent
      const currentTime = current.querySelector('.who > span:last-child')?.textContent
      const isPlainMessage =
        previous.matches('.msg:not(.msg-script)') &&
        current.matches('.msg:not(.msg-script)') &&
        previous.querySelector(':scope > .body > .txt') &&
        current.querySelector(':scope > .body > .txt')
      const sameSpeaker =
        isPlainMessage &&
        previousName &&
        currentName &&
        previousName === currentName

      current.classList.toggle('msg-cont', Boolean(sameSpeaker))
      if (sameSpeaker) {
        setContinuationTime(current, previousTime === currentTime ? '' : currentTime)
      } else {
        setContinuationTime(current, '')
      }
    }
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

  let scheduled = false
  let observedLog = null
  let logObserver = null

  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      applyCompactMessages()
      applyLuckLimit()
    })
  }

  function watchChatLog() {
    const nextLog = document.querySelector('.log')
    if (nextLog === observedLog) return

    logObserver?.disconnect()
    observedLog = nextLog
    if (!observedLog) return

    logObserver = new MutationObserver(schedule)
    logObserver.observe(observedLog, { childList: true })
    schedule()
  }

  renameDecorReset()
  watchChatLog()
  new MutationObserver(watchChatLog).observe(document.body, {
    childList: true,
    subtree: true
  })
  document.addEventListener('click', () => requestAnimationFrame(renameDecorReset))
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
})()
