const HANDOUT_PATTERN = /^\s*\[handout(?:=([^\]]{0,120}))?\]([\s\S]*?)\[\/handout\]\s*$/i
const HANDOUT_LABEL = 'HANDOUT'

function createHandout(title, body) {
  const card = document.createElement('article')
  card.className = 'taco-inline-handout'
  card.setAttribute('aria-label', title ? `핸드아웃: ${title}` : '핸드아웃')

  const header = document.createElement('div')
  header.className = 'taco-inline-handout__header'
  const mark = document.createElement('span')
  mark.className = 'taco-inline-handout__mark'
  mark.setAttribute('aria-hidden', 'true')
  const label = document.createElement('span')
  label.className = 'taco-inline-handout__label'
  label.textContent = HANDOUT_LABEL
  header.append(mark, label)

  const content = document.createElement('div')
  content.className = 'taco-inline-handout__content'
  if (title) {
    const heading = document.createElement('strong')
    heading.className = 'taco-inline-handout__title'
    heading.textContent = title
    content.appendChild(heading)
  }

  const text = document.createElement('div')
  text.className = 'taco-inline-handout__body'
  text.append(body)
  content.appendChild(text)
  card.append(header, content)
  return card
}

function getTextWithLineBreaks(node) {
  let text = ''
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let current = walker.currentNode
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) text += current.nodeValue || ''
    else if (current.nodeName === 'BR') text += '\n'
    current = walker.nextNode()
  }
  return text
}

function cloneMarkup(node) {
  if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.nodeValue || '')
  if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment()
  const clone = node.cloneNode(false)
  for (const child of node.childNodes) clone.appendChild(cloneMarkup(child))
  return clone
}

function createHandoutBody(host) {
  const body = document.createDocumentFragment()
  for (const child of host.childNodes) body.appendChild(cloneMarkup(child))
  const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT)
  const textNodes = []
  let current = walker.nextNode()
  while (current) {
    textNodes.push(current)
    current = walker.nextNode()
  }
  textNodes[0].nodeValue = (textNodes[0].nodeValue || '').replace(/^\s*\[handout(?:=[^\]]{0,120})?\]/i, '')
  const last = textNodes[textNodes.length - 1]
  last.nodeValue = (last.nodeValue || '').replace(/\[\/handout\]\s*$/i, '')
  return body
}

function renderHandouts() {
  document.querySelectorAll('.txt:not([data-handout-rendered]), .msg-script:not([data-handout-rendered])').forEach((host) => {
    const match = HANDOUT_PATTERN.exec(getTextWithLineBreaks(host))
    if (!match) return
    const title = (match[1] || '').trim()
    const shadow = host.attachShadow({ mode: 'open' })
    const style = document.createElement('style')
    style.textContent = HANDOUT_STYLE
    shadow.append(style, createHandout(title, createHandoutBody(host)))
    host.dataset.handoutRendered = 'true'
  })
}

function scheduleRender() {
  queueMicrotask(renderHandouts)
}

const HANDOUT_STYLE = `
:host { display: block; margin: 10px 0; }
.txt[data-handout-rendered] { display: block; margin: 10px 0; }
.taco-inline-handout { overflow: hidden; border: 1px solid var(--line2, #3a4655); border-radius: 10px; background: var(--bg2, #1a2029); color: var(--tx, #e8edf3); box-shadow: 0 8px 22px rgb(0 0 0 / 14%); }
@supports (background: color-mix(in srgb, black, white)) {
  .taco-inline-handout { background: color-mix(in srgb, var(--bg2, #1a2029) 90%, var(--accent, #7c9cff) 10%); border-color: color-mix(in srgb, var(--line2, #3a4655) 75%, var(--accent, #7c9cff) 25%); }
  .taco-inline-handout__header { background: color-mix(in srgb, var(--bg2, #1a2029) 78%, var(--accent, #7c9cff) 22%); }
  .taco-inline-handout__label { color: color-mix(in srgb, var(--tx, #e8edf3) 66%, var(--accent, #7c9cff) 34%); }
  .taco-inline-handout__body { color: color-mix(in srgb, var(--tx, #e8edf3) 84%, transparent); }
}
.taco-inline-handout__header { display: flex; align-items: center; gap: 9px; min-height: 34px; padding: 0 13px; border-bottom: 1px solid var(--line2, #3a4655); background: var(--bg, #202a37); }
.taco-inline-handout__mark { width: 7px; height: 7px; border-radius: 50%; background: var(--accent, #7c9cff); }
.taco-inline-handout__label { font-size: 10px; font-weight: 700; letter-spacing: .12em; color: var(--accent, #7c9cff); }
.taco-inline-handout__content { padding: 14px 16px 16px; }
.taco-inline-handout__title { display: block; margin: 0 0 8px; font-size: 15px; font-weight: 700; line-height: 1.35; color: var(--tx, #e8edf3); }
.taco-inline-handout__body { white-space: pre-wrap; font-size: 13px; line-height: 1.7; color: var(--tx, #c8d1db); }
.mk-check { display: inline-block; min-width: 132px; margin: 8px 0; padding: 5px 40px; border: 1px solid #fff; border-radius: 20px; background: linear-gradient(90deg, #828282 0%, #000 100%); box-shadow: 0 0 2px 1px #8f8f8f; color: #fff; font-size: 12px; font-style: normal; font-weight: 600; letter-spacing: -1px; line-height: 1.35; text-align: center; text-shadow: 0 0 5px #000; }
`

const hostStyle = document.createElement('style')
hostStyle.textContent = '.txt[data-handout-rendered] { display: block; margin: 10px 0; } .msg-script[data-handout-rendered], .msg-script:has(.mk-check) { background: none; padding: 0; }'
document.head.appendChild(hostStyle)

new MutationObserver(scheduleRender).observe(document.documentElement, { childList: true, subtree: true, characterData: true })
scheduleRender()
