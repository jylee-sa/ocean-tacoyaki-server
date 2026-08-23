(() => {
  const ROOT_ID = 'gm-tool-root'

  function isGm() {
    return Boolean(document.querySelector('option[value="npc"]'))
  }

  function setChatText(input, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function sendCheck(text) {
    const input = document.querySelector('textarea[data-chat-input]')
    if (!(input instanceof HTMLTextAreaElement)) return false
    const content = text.trim().replaceAll('[', '［').replaceAll(']', '］')
    if (!content) return false
    setChatText(input, `/desc [check]${content} 판정[/check]`)
    requestAnimationFrame(() => input.closest('.compose')?.querySelector('button[data-sfx="send"]')?.click())
    return true
  }

  function openCheckModal() {
    const veil = document.createElement('div')
    veil.className = 'gm-check-veil'
    veil.innerHTML = '<form class="gm-check-modal"><h3>판정 보내기</h3><p>문구 뒤에 ‘판정’이 붙어 전송됩니다.</p><input type="text" maxlength="120" placeholder="예: 관찰력" autocomplete="off"><div class="gm-check-actions"><button type="button" class="btn sm" data-close>취소</button><button type="submit" class="btn sm pri" disabled>전송</button></div></form>'
    const form = veil.querySelector('form')
    const input = veil.querySelector('input')
    const submit = veil.querySelector('[type="submit"]')
    const close = () => veil.remove()

    input?.addEventListener('input', () => {
      if (submit instanceof HTMLButtonElement && input instanceof HTMLInputElement) submit.disabled = !input.value.trim()
    })
    form?.addEventListener('submit', (event) => {
      event.preventDefault()
      if (input instanceof HTMLInputElement && sendCheck(input.value)) close()
    })
    veil.addEventListener('mousedown', (event) => event.target === veil && close())
    veil.querySelector('[data-close]')?.addEventListener('click', close)
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
    root.innerHTML = '<section class="gm-tool-panel"><div class="gm-tool-head"><span>GM</span><button class="gm-tool-close" type="button">×</button></div><button class="gm-tool-macro" type="button">✓ 판정</button></section><button class="gm-tool-tab" type="button" title="GM 도구" aria-expanded="false">▮</button>'
    const toggle = (open) => {
      root.classList.toggle('is-open', open)
      root.querySelector('.gm-tool-tab')?.setAttribute('aria-expanded', String(open))
    }
    root.querySelector('.gm-tool-tab')?.addEventListener('click', () => toggle(!root.classList.contains('is-open')))
    root.querySelector('.gm-tool-close')?.addEventListener('click', () => toggle(false))
    root.querySelector('.gm-tool-macro')?.addEventListener('click', openCheckModal)
    chat.append(root)
  }

  mount()
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true })
})()
