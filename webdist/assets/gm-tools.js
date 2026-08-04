(() => {
  const ROOT_ID = 'gm-tool-root'
  const STYLE_ID = 'gm-tool-style'
  const INPUT_SELECTOR = 'textarea[data-chat-input]'

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return

    const style = document.createElement('style')
    style.id = STYLE_ID
    style.textContent = `
      .gm-tool-root { position:absolute; right:100%; bottom:24px; z-index:40; width:36px; height:36px; }
      .gm-tool-panel { position:absolute; right:0; bottom:44px; width:104px; box-sizing:border-box; padding:7px; background:var(--bg2); border:1px solid var(--line); border-radius:10px 0 0 10px; box-shadow:-8px -8px 22px #0004; opacity:0; pointer-events:none; transform:translateY(10px); transition:opacity .16s ease,transform .18s ease; }
      .gm-tool-root.is-open .gm-tool-panel { opacity:1; pointer-events:auto; transform:translateY(0); }
      .gm-tool-tab { position:absolute; top:0; right:0; display:grid; width:36px; height:36px; place-items:center; padding:0; border:1px solid var(--line); border-right:0; border-radius:9px 0 0 9px; background:var(--bg3); color:var(--tx2); cursor:pointer; }
      .gm-tool-tab .material-symbols-outlined { font-size:20px; }
      .gm-tool-tab:hover { color:var(--tx); background:var(--bg2); }
      .gm-tool-head { display:flex; align-items:center; justify-content:space-between; margin:0 0 7px; color:var(--tx); font-size:12px; font-weight:800; }
      .gm-tool-close { width:22px; height:22px; padding:0; border:0; border-radius:5px; background:transparent; color:var(--tx3); font-size:18px; line-height:1; cursor:pointer; }
      .gm-tool-close:hover { background:var(--bg3); color:var(--tx); }
      .gm-tool-macro { display:flex; width:100%; align-items:center; gap:7px; padding:8px 9px; border:1px solid var(--line2); border-radius:7px; background:var(--bg3); color:var(--tx); font:700 12px/1.2 inherit; cursor:pointer; }
      .gm-tool-macro:hover { border-color:var(--accent); color:var(--accent); }
      .gm-tool-hint { margin:9px 2px 1px; color:var(--tx3); font-size:10px; line-height:1.45; }
      .gm-check-veil { position:fixed; inset:0; z-index:5000; display:grid; place-items:center; background:#0007; }
      .gm-check-modal { width:min(320px,calc(100vw - 32px)); box-sizing:border-box; padding:14px; border:1px solid var(--line); border-radius:10px; background:var(--bg2); box-shadow:0 18px 60px #0009; }
      .gm-check-modal h3 { margin:0; color:var(--tx); font-size:14px; }
      .gm-check-modal p { margin:4px 0 9px; color:var(--tx3); font-size:11px; }
      .gm-check-modal input { display:block; box-sizing:border-box; width:100%; height:34px; padding:7px 9px; border:1px solid var(--line2); border-radius:7px; background:var(--bg3); color:var(--tx); font:inherit; }
      .gm-check-modal input:focus { outline:none; border-color:var(--accent); }
      .gm-check-actions { display:flex; justify-content:flex-end; gap:7px; margin-top:9px; }
      html[data-mobile] .gm-tool-root { display:none; }
    `
    document.head.append(style)
  }

  function isGm() {
    return Boolean(document.querySelector('option[value="npc"]'))
  }

  function setChatText(input, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function sendCheck(text) {
    const input = document.querySelector(INPUT_SELECTOR)
    if (!(input instanceof HTMLTextAreaElement)) return false

    const safeText = text.trim().replaceAll('[', '［').replaceAll(']', '］')
    if (!safeText) return false

    setChatText(input, `[check]${safeText} 판정[/check]`)
    requestAnimationFrame(() => {
      const sendButton = input.closest('.compose')?.querySelector('button[data-sfx="send"]')
      if (sendButton instanceof HTMLButtonElement) sendButton.click()
    })
    return true
  }

  function openCheckModal() {
    const veil = document.createElement('div')
    veil.className = 'gm-check-veil'
    veil.innerHTML = `
      <form class="gm-check-modal" aria-label="판정 보내기">
        <h3>판정 보내기</h3>
        <p>문구 뒤에 ‘판정’이 붙어 채팅으로 전송됩니다.</p>
        <input type="text" maxlength="120" placeholder="예: 관찰력" autocomplete="off">
        <div class="gm-check-actions">
          <button type="button" class="btn sm" data-action="cancel">취소</button>
          <button type="submit" class="btn sm pri" disabled>전송</button>
        </div>
      </form>
    `

    const form = veil.querySelector('form')
    const input = veil.querySelector('input')
    const submit = veil.querySelector('[type="submit"]')
    const close = () => veil.remove()

    input?.addEventListener('input', () => {
      if (submit instanceof HTMLButtonElement && input instanceof HTMLInputElement) submit.disabled = !input.value.trim()
    })
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        form?.requestSubmit()
      }
    })
    form?.addEventListener('submit', (event) => {
      event.preventDefault()
      if (input instanceof HTMLInputElement && sendCheck(input.value)) close()
    })
    veil.addEventListener('mousedown', (event) => {
      if (event.target === veil) close()
    })
    veil.querySelector('[data-action="cancel"]')?.addEventListener('click', close)

    document.body.append(veil)
    input?.focus()
  }

  function mount() {
    const chat = document.querySelector('.chat')
    const existing = document.getElementById(ROOT_ID)

    if (!chat || !isGm()) {
      existing?.remove()
      return
    }
    if (existing?.parentElement === chat) return

    existing?.remove()
    const root = document.createElement('div')
    root.id = ROOT_ID
    root.className = 'gm-tool-root'
    root.innerHTML = `
      <section class="gm-tool-panel" aria-label="GM 매크로">
        <div class="gm-tool-head"><span>GM</span><button class="gm-tool-close" type="button" aria-label="GM 도구 닫기">×</button></div>
        <button class="gm-tool-macro" type="button"><span aria-hidden="true">✓</span> 판정</button>
      </section>
      <button class="gm-tool-tab" type="button" aria-label="GM 도구" title="GM 도구" aria-expanded="false"><span class="material-symbols-outlined" aria-hidden="true">bookmark</span></button>
    `

    const tab = root.querySelector('.gm-tool-tab')
    const close = root.querySelector('.gm-tool-close')
    const macro = root.querySelector('.gm-tool-macro')
    const toggle = (open) => {
      root.classList.toggle('is-open', open)
      tab?.setAttribute('aria-expanded', String(open))
    }

    tab?.addEventListener('click', () => toggle(!root.classList.contains('is-open')))
    close?.addEventListener('click', () => toggle(false))
    macro?.addEventListener('click', openCheckModal)
    chat.append(root)
  }

  injectStyle()
  mount()
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true })
})()
