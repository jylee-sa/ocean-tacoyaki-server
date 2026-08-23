(() => {
  const MARKED = 'data-tabak-markup'
  const STYLE_PROPERTIES = new Set([
    'background-color', 'color', 'display', 'font-size', 'font-style', 'font-weight',
    'letter-spacing', 'line-height', 'margin', 'padding', 'text-align', 'text-decoration', 'text-shadow'
  ])

  function textNode(value) {
    return document.createTextNode(value)
  }

  function setSafeStyle(element, source) {
    for (const rule of source.split(';').slice(0, 16)) {
      const separator = rule.indexOf(':')
      if (separator < 1) continue
      const name = rule.slice(0, separator).trim().toLowerCase()
      const value = rule.slice(separator + 1).trim().replace(/!\s*important/gi, '')
      if (!STYLE_PROPERTIES.has(name) || !value || value.length > 180) continue
      if (/url\(|expression|javascript:|@import|[<>]|\/\*/i.test(value)) continue
      element.style.setProperty(name, value)
    }
  }

  function replaceStyle(message, source, content) {
    const style = document.createElement('span')
    style.className = 'tabak-style'
    setSafeStyle(style, source)
    style.append(textNode(content))
    message.replaceChildren(style)
  }

  function replaceCheck(message, content) {
    const check = document.createElement('span')
    check.className = 'mk-check'
    check.append(textNode(content))
    message.replaceChildren(check)
  }

  function replaceHandout(message, title, content) {
    const handout = document.createElement('article')
    handout.className = 'mk-handout'
    handout.innerHTML = '<div class="mk-handout-header"><span class="mk-handout-mark"></span><span>HANDOUT</span></div><div class="mk-handout-content"></div>'
    const body = handout.querySelector('.mk-handout-content')
    if (title) {
      const heading = document.createElement('strong')
      heading.className = 'mk-handout-title'
      heading.append(textNode(title))
      body?.append(heading)
    }
    const text = document.createElement('div')
    text.className = 'mk-handout-body'
    text.append(textNode(content))
    body?.append(text)
    message.replaceChildren(handout)
  }

  function applyCompatibilityMarkup(message) {
    if (message.getAttribute(MARKED) === '1') return
    const raw = message.textContent ?? ''
    const style = /^\[style=([^\]]*)\]([\s\S]*)\[\/style\]$/.exec(raw)
    const check = /^\[check\]([\s\S]*)\[\/check\]$/.exec(raw)
    const handout = /^\[handout(?:=([^\]]*))?\]([\s\S]*)\[\/handout\]$/.exec(raw)

    if (style) replaceStyle(message, style[1], style[2])
    else if (check) replaceCheck(message, check[1])
    else if (handout) replaceHandout(message, handout[1] ?? '', handout[2])
    else return

    message.setAttribute(MARKED, '1')
  }

  function applyCompactMessages() {
    const messages = [...document.querySelectorAll('.log > .msg')]
    for (let index = 1; index < messages.length; index += 1) {
      const previous = messages[index - 1]
      const current = messages[index]
      const previousName = previous.querySelector('.who > span')?.textContent
      const currentName = current.querySelector('.who > span')?.textContent
      const previousTime = previous.querySelector('.who > span:last-child')?.textContent
      const currentTime = current.querySelector('.who > span:last-child')?.textContent
      const isPlainMessage = previous.querySelector(':scope > .body > .txt') && current.querySelector(':scope > .body > .txt')
      const sameSpeaker = isPlainMessage && previousName && currentName && previousTime && currentTime && previousName === currentName && previousTime === currentTime
      current.classList.toggle('msg-cont', Boolean(sameSpeaker))
    }
  }

  function refresh() {
    document.querySelectorAll('.msg-script').forEach(applyCompatibilityMarkup)
    applyCompactMessages()
  }

  refresh()
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true })
})()
