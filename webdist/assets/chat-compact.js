(() => {
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

  let scheduled = false
  function schedule() {
    if (scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      applyCompactMessages()
    })
  }

  schedule()
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true })
})()
