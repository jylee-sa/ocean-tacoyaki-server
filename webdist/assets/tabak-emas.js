(() => {
  const STYLE_ID = 'tabak-emas-style'
  const MARKER = {
    fontStyle: 'italic',
    fontWeight: 700,
    letterSpacing: '0px',
    display: 'block'
  }

  function isEmas(message) {
    return Array.from(message.querySelectorAll('span')).some((span) =>
      span.style.fontStyle === MARKER.fontStyle &&
      Number(span.style.fontWeight) === MARKER.fontWeight &&
      span.style.letterSpacing === MARKER.letterSpacing &&
      span.style.display === MARKER.display
    )
  }

  function applyEmasStyle() {
    document.querySelectorAll('.msg-script').forEach((message) => {
      message.classList.toggle('emas', isEmas(message))
    })
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .msg-script.emas {
        background: linear-gradient(90deg, light-dark(#fff0e2, #4b3021), light-dark(#fff7ee, #3c2b22));
        color: light-dark(#943f00, #ffd1ac);
        font-style: italic;
        font-weight: 700;
      }
    `
    document.head.append(style)
  }

  injectStyle()
  applyEmasStyle()
  new MutationObserver(applyEmasStyle).observe(document.body, { childList: true, subtree: true })
})()
