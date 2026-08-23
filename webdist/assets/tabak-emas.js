(() => {
  const STYLE_ID = 'tabak-emas-style'

  function isEmas(message) {
    return [...message.querySelectorAll('.mk-css')].some((span) =>
      span.style.fontStyle === 'italic' &&
      Number(span.style.fontWeight) === 700 &&
      span.style.letterSpacing === '0px' &&
      span.style.display === 'block'
    )
  }

  function refresh() {
    document.querySelectorAll('.msg-script').forEach((message) => {
      message.classList.toggle('emas', isEmas(message))
    })
  }

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = '.msg-script.emas{background:linear-gradient(90deg,light-dark(#fff0e2,#4b3021),light-dark(#fff7ee,#3c2b22));color:light-dark(#943f00,#ffd1ac);font-style:italic;font-weight:700}'
    document.head.append(style)
  }

  refresh()
  new MutationObserver(refresh).observe(document.body, { childList: true, subtree: true })
})()
