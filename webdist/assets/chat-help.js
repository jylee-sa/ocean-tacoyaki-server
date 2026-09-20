(() => {
  const BUTTON_ID = 'tabak-chat-help'
  const PANEL_ID = 'tabak-chat-help-panel'

  function isGm() {
    return Boolean(document.querySelector('option[value="npc"]'))
  }

  function rows(items) {
    return items.map(([code, text]) => `<div class="tabak-help-row"><code>${code}</code><span>${text}</span></div>`).join('')
  }

  function section(title, items) {
    return `<section class="tabak-help-section"><h4>${title}</h4>${rows(items)}</section>`
  }

  function helpContent() {
    const gm = isGm()
    return [
      '<header class="tabak-help-head"><strong>채팅 도움말</strong><button type="button" aria-label="닫기">×</button></header>',
      section('스크립트', [['/desc 내용 · /d 내용', '프로필 없는 지문']]),
      gm ? section('강조 · GM', [['/emas 내용 · /e 내용', '강조 지문']]) : '',
      section('판정·주사위', [
        ['CC&lt;=60', '기능 판정'],
        ['CC±1&lt;=60', '보너스·페널티'],
        ['밀어붙이기 CC&lt;=60', '밀어붙이기'],
        ['SC 1d6/1d20&lt;=60', '이성 판정'],
        ['대결(60,40)', '대결 판정'],
        ['2d6+1 · 4d6kh3', '일반 주사위 식'],
        ['[[1d6]]', '문장 안 주사위'],
        ['CC&lt;=60 (관찰력)', '판정 카드 라벨']
      ]),
      section('글자 꾸미기', [
        ['*내용* · [i]내용[/i]', '기울임'],
        ['**내용** · [b]내용[/b]', '굵게'],
        ['***내용***', '굵은 기울임'],
        ['[u]내용[/u] · [s]내용[/s]', '밑줄 · 취소선'],
        ['[dim]내용[/dim]', '흐리게'],
        ['[color=#f66]내용[/color]', '글자색'],
        ['[bg=#223]내용[/bg]', '글자 배경색'],
        ['[size=18]내용[/size]', '글자 크기'],
        ['[ruby=루비]漢字[/ruby]', '루비']
      ]),
      section('배치·박스·이미지', [
        ['[center]내용[/center]', '가운데 정렬'],
        ['[right]내용[/right]', '오른쪽 정렬'],
        ['[left]내용[/left]', '왼쪽 정렬'],
        ['[box=#223]내용[/box]', '배경 박스'],
        ['[bubble=#223]내용[/bubble]', '말풍선 박스'],
        ['[img=이미지 주소]', '이미지 표시'],
        ['[css=color:#fff;…]내용[/css]', 'CSS 꾸미기'],
        ['[style=color:#fff;…]내용[/style]', '스크립트 호환 CSS']
      ]),
      gm
        ? section('GM 마크업', [
            ['[check]관찰력[/check]', '판정 카드'],
            ['[handout=제목]본문[/handout]', '핸드아웃 카드']
          ])
        : ''
    ].join('')
  }

  function closeHelp() {
    document.getElementById(PANEL_ID)?.remove()
  }

  function openHelp(button) {
    closeHelp()
    const panel = document.createElement('aside')
    panel.id = PANEL_ID
    panel.className = 'tabak-chat-help-panel'
    panel.innerHTML = helpContent()
    panel.querySelector('button')?.addEventListener('click', closeHelp)
    document.body.append(panel)

    const rect = button.getBoundingClientRect()
    const width = Math.min(300, window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.right + 8, window.innerWidth - width - 8))
    const bottom = Math.max(8, window.innerHeight - rect.bottom)
    panel.style.width = `${width}px`
    panel.style.left = `${left}px`
    panel.style.bottom = `${bottom}px`
  }

  function syncHelpButton() {
    const bookmark = [...document.querySelectorAll('.rail-bottom > button')].find((button) =>
      button.title.startsWith('꾸미기 북마크')
    )
    const existing = document.getElementById(BUTTON_ID)
    if (!bookmark) {
      existing?.remove()
      closeHelp()
      return
    }
    if (existing) return

    const button = document.createElement('button')
    button.id = BUTTON_ID
    button.type = 'button'
    button.className = 'tool tabak-chat-help-toggle'
    button.title = '채팅 명령어·마크업 도움말'
    button.setAttribute('aria-label', '채팅 도움말')
    button.textContent = '?'
    button.addEventListener('click', () => {
      if (document.getElementById(PANEL_ID)) closeHelp()
      else openHelp(button)
    })
    bookmark.after(button)
  }

  document.addEventListener('pointerdown', (event) => {
    const panel = document.getElementById(PANEL_ID)
    const button = document.getElementById(BUTTON_ID)
    if (panel && !panel.contains(event.target) && !button?.contains(event.target)) closeHelp()
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeHelp()
  })

  syncHelpButton()
  new MutationObserver(syncHelpButton).observe(document.body, { childList: true, subtree: true })
})()
