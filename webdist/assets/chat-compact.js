(() => {
  const MAX_LUCK_CARD_COST = 10

  function applyCompactMessages() {
    const messages = [...document.querySelectorAll('.log > .msg')]

    for (let index = 1; index < messages.length; index += 1) {
      const previous = messages[index - 1]
      const current = messages[index]
      const previousName = previous.querySelector('.who > span')?.textContent
      const currentName = current.querySelector('.who > span')?.textContent
      const previousTime = previous.querySelector('.who > span:last-child')?.textContent
      const currentTime = current.querySelector('.who > span:last-child')?.textContent
      const isPlainMessage =
        previous.querySelector(':scope > .body > .txt') && current.querySelector(':scope > .body > .txt')
      const sameSpeaker =
        isPlainMessage &&
        previousName &&
        currentName &&
        previousTime &&
        currentTime &&
        previousName === currentName &&
        previousTime === currentTime

      current.classList.toggle('msg-cont', Boolean(sameSpeaker))
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

  let scheduled = false
  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      applyCompactMessages()
      applyLuckLimit()
    })
  }

  schedule()
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  })
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
