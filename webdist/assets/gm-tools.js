(() => {
  const ROOT_ID = 'gm-tool-root'
  let queuedSentences = []
  let queueIndex = 0
  let savedNames = { kpc: '', pc: '' }

  function isGm() {
    return Boolean(document.querySelector('option[value="npc"]'))
  }

  function saveNames(names) {
    savedNames = names
  }

  function setChatText(input, text) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    setter?.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }

  function sendChat(text) {
    const input = document.querySelector('textarea[data-chat-input]')
    if (!(input instanceof HTMLTextAreaElement) || !text.trim()) return false
    setChatText(input, text)
    requestAnimationFrame(() => input.closest('.compose')?.querySelector('button[data-sfx="send"]')?.click())
    return true
  }

  function sendCheck(text) {
    const content = text.trim().replaceAll('[', '［').replaceAll(']', '］')
    return sendChat(`/desc [check]${content} 판정[/check]`)
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

  function normalizePdfLineBreaks(text) {
    return text
      .replace(/\r\n?/g, '\n')
      .replace(/\n[\t ]*\n+/g, '\n\n')
      .replace(/([^\n])\n([^\n])/g, '$1 $2')
  }

  function splitSentences(text, normalize) {
    const source = (normalize ? normalizePdfLineBreaks(text) : text).trim()
    if (!source) return []
    return source
      .replace(/([.!?…。]+[”’"')\]】』」]*)[ \t]+/g, '$1\n')
      .split(/\n+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
  }

  function getHangulEnding(name) {
    const last = [...name.trim()].at(-1)
    if (!last) return null
    const code = last.codePointAt(0)
    if (code < 0xac00 || code > 0xd7a3) return null
    return (code - 0xac00) % 28
  }

  function matchParticle(name, particle) {
    const ending = getHangulEnding(name)
    if (ending === null) return particle
    const hasBatchim = ending !== 0
    if (particle === '은' || particle === '는') return hasBatchim ? '은' : '는'
    if (particle === '이' || particle === '가') return hasBatchim ? '이' : '가'
    if (particle === '을' || particle === '를') return hasBatchim ? '을' : '를'
    if (particle === '과' || particle === '와') return hasBatchim ? '과' : '와'
    return hasBatchim && ending !== 8 ? '으로' : '로'
  }

  function replaceRoleNames(text, names) {
    return [['KPC', names.kpc], ['PC', names.pc]].reduce((result, [token, name]) => {
      if (!name.trim()) return result
      const withParticle = new RegExp(`\\b${token}(은|는|이|가|을|를|과|와|으로|로)`, 'g')
      const plainToken = new RegExp(`\\b${token}\\b`, 'g')
      return result.replace(withParticle, (_, particle) => `${name}${matchParticle(name, particle)}`).replace(plainToken, name)
    }, text)
  }

  function updateQueueUi() {
    const root = document.getElementById(ROOT_ID)
    const queue = root?.querySelector('.gm-tool-queue')
    const next = root?.querySelector('[data-queue-next]')
    if (!(queue instanceof HTMLElement) || !(next instanceof HTMLButtonElement)) return
    const hasQueue = queueIndex < queuedSentences.length
    queue.hidden = !hasQueue
    if (hasQueue) next.textContent = `› 다음 ${queueIndex + 1} / ${queuedSentences.length}`
  }

  function clearQueue() {
    queuedSentences = []
    queueIndex = 0
    updateQueueUi()
  }

  function sendNextSentence() {
    const sentence = queuedSentences[queueIndex]
    if (!sentence || !sendChat(`/desc ${sentence}`)) return
    queueIndex += 1
    updateQueueUi()
  }

  function openScriptModal() {
    const veil = document.createElement('div')
    veil.className = 'gm-check-veil'
    veil.innerHTML = '<form class="gm-script-modal"><div class="gm-script-title"><div><h3>문장 나누기</h3><p>PDF에서 복사한 줄바꿈을 정리한 뒤, 한 문장씩 큐에 담습니다.</p></div><button type="button" class="gm-tool-close" data-close>×</button></div><div class="gm-script-names"><label>KPC명<input type="text" maxlength="40" data-kpc autocomplete="off" placeholder="예: 하즈키"></label><label>PC명<input type="text" maxlength="40" data-pc autocomplete="off" placeholder="예: 유진"></label></div><label class="gm-script-option"><input type="checkbox" data-normalize checked> PDF 줄바꿈 정리</label><textarea data-source rows="7" placeholder="긴 스크립트를 붙여 넣으세요. KPC와 PC는 위 이름으로 치환되고, 조사도 자동으로 맞춥니다."></textarea><div class="gm-check-actions"><button type="button" class="btn sm" data-close>취소</button><button type="button" class="btn sm" data-split>문장 나누기</button></div><section class="gm-script-result" hidden><div class="gm-script-result-head"><strong>문장 목록</strong><span data-count></span></div><div data-sentences></div><div class="gm-check-actions"><button type="submit" class="btn sm pri">큐 시작</button></div></section></form>'
    const form = veil.querySelector('form')
    const source = veil.querySelector('[data-source]')
    const kpc = veil.querySelector('[data-kpc]')
    const pc = veil.querySelector('[data-pc]')
    const normalize = veil.querySelector('[data-normalize]')
    const result = veil.querySelector('.gm-script-result')
    const sentenceList = veil.querySelector('[data-sentences]')
    const count = veil.querySelector('[data-count]')
    let sentences = []
    const close = () => veil.remove()

    if (kpc instanceof HTMLInputElement) kpc.value = savedNames.kpc
    if (pc instanceof HTMLInputElement) pc.value = savedNames.pc

    function names() {
      return {
        kpc: kpc instanceof HTMLInputElement ? kpc.value.trim() : '',
        pc: pc instanceof HTMLInputElement ? pc.value.trim() : ''
      }
    }

    function renderSentences() {
      if (!(sentenceList instanceof HTMLElement) || !(result instanceof HTMLElement)) return
      sentenceList.replaceChildren()
      const currentNames = names()
      sentences.forEach((sentence, index) => {
        const row = document.createElement('div')
        row.className = 'gm-script-sentence'
        const number = document.createElement('span')
        number.textContent = String(index + 1)
        const editor = document.createElement('textarea')
        editor.rows = 2
        editor.value = sentence
        editor.setAttribute('aria-label', `${index + 1}번 문장`)
        const preview = document.createElement('p')
        preview.className = 'gm-script-preview'
        preview.textContent = replaceRoleNames(sentence, currentNames)
        editor.addEventListener('input', () => {
          sentences[index] = editor.value.trim()
          preview.textContent = replaceRoleNames(sentences[index], names())
        })
        const remove = document.createElement('button')
        remove.type = 'button'
        remove.className = 'gm-script-remove'
        remove.textContent = '×'
        remove.title = '문장 삭제'
        remove.addEventListener('click', () => {
          sentences.splice(index, 1)
          renderSentences()
        })
        row.append(number, editor, remove, preview)
        sentenceList.append(row)
      })
      if (count instanceof HTMLElement) count.textContent = `${sentences.length}문장`
      result.hidden = !sentences.length
    }

    function split() {
      if (!(source instanceof HTMLTextAreaElement)) return
      sentences = splitSentences(source.value, normalize instanceof HTMLInputElement && normalize.checked)
      renderSentences()
    }

    veil.querySelector('[data-split]')?.addEventListener('click', split)
    ;[kpc, pc].forEach((input) => input?.addEventListener('input', () => {
      saveNames(names())
      renderSentences()
    }))
    form?.addEventListener('submit', (event) => {
      event.preventDefault()
      if (!sentences.length) split()
      const ready = sentences.map((sentence) => replaceRoleNames(sentence.trim(), names())).filter(Boolean)
      if (!ready.length) return
      saveNames(names())
      queuedSentences = ready
      queueIndex = 0
      updateQueueUi()
      close()
    })
    veil.addEventListener('mousedown', (event) => event.target === veil && close())
    veil.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', close))
    document.body.append(veil)
    source?.focus()
  }

  function mount() {
    const chat = document.querySelector('.chat')
    const existing = document.getElementById(ROOT_ID)
    if (!chat || !isGm()) {
      existing?.remove()
      savedNames = { kpc: '', pc: '' }
      clearQueue()
      return
    }
    if (existing?.parentElement === chat) return
    existing?.remove()

    const root = document.createElement('div')
    root.id = ROOT_ID
    root.className = 'gm-tool-root'
    root.innerHTML = '<section class="gm-tool-panel"><div class="gm-tool-head"><span>GM</span><button class="gm-tool-close" type="button">×</button></div><button class="gm-tool-macro" type="button" data-check>✓ 판정</button><button class="gm-tool-macro" type="button" data-script>≡ 문장</button><div class="gm-tool-queue" hidden><button class="gm-tool-macro gm-tool-next" type="button" data-queue-next></button><button class="gm-tool-queue-stop" type="button" data-queue-stop>큐 종료</button></div></section><button class="gm-tool-tab" type="button" title="GM 도구" aria-expanded="false">▮</button>'
    const toggle = (open) => {
      root.classList.toggle('is-open', open)
      root.querySelector('.gm-tool-tab')?.setAttribute('aria-expanded', String(open))
    }
    root.querySelector('.gm-tool-tab')?.addEventListener('click', () => toggle(!root.classList.contains('is-open')))
    root.querySelector('.gm-tool-close')?.addEventListener('click', () => toggle(false))
    root.querySelector('[data-check]')?.addEventListener('click', openCheckModal)
    root.querySelector('[data-script]')?.addEventListener('click', openScriptModal)
    root.querySelector('[data-queue-next]')?.addEventListener('click', sendNextSentence)
    root.querySelector('[data-queue-stop]')?.addEventListener('click', clearQueue)
    chat.append(root)
    updateQueueUi()
  }

  mount()
  new MutationObserver(mount).observe(document.body, { childList: true, subtree: true })
})()
