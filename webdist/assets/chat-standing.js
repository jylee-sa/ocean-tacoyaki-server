import { r as React, j as jsx, I as Icon, d as useUi, E as useSession } from './index-DnAfYmnE.js'

const normalizeCommand = (command) => (command ?? '').trim().replace(/^\/+/, '').toLowerCase()

export function getStandingCommands(character) {
  const portrait = character?.portrait
  const seen = new Set()
  return (portrait?.standings ?? []).flatMap((image, index) => {
    const command = (portrait.commands?.[index] ?? '').trim().replace(/^\/+/, '')
    const key = normalizeCommand(command)
    if (!image || !key || /[\s/]/.test(command) || seen.has(key)) return []
    seen.add(key)
    return [{ command: `/${command}`, index }]
  })
}

export function appendStandingCommand(text, command, commands) {
  let value = text.trimEnd()
  const tail = /(?:^|\s)(\/[^\s/]+)$/.exec(value)
  if (tail && commands.some((entry) => normalizeCommand(entry.command) === normalizeCommand(tail[1]))) {
    value = value.slice(0, tail.index).trimEnd()
  }
  return `${value ? `${value} ` : ''}${command}`
}

export function StandingCommandButton({ character, value, onChange }) {
  const view = useUi((state) => state.roomView)
  const overlay = useSession((state) => state.roomVnOverlay)
  const visible = view === 'vn' || overlay
  const [open, setOpen] = React.useState(false)
  const control = React.useRef(null)
  const trigger = React.useRef(null)
  const commands = React.useMemo(() => getStandingCommands(character), [character])
  const popupId = React.useId()

  React.useEffect(() => setOpen(false), [character?.id, visible])
  React.useEffect(() => {
    if (!open || !control.current) return
    const document = control.current.ownerDocument
    const dismiss = (event) => {
      if (!control.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      trigger.current?.focus()
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape, true)
    }
  }, [open])

  if (!visible) return null
  const select = (command) => {
    onChange(appendStandingCommand(value, command, commands))
    setOpen(false)
  }
  return jsx.jsxs('div', {
    className: 'chat-standing-control', ref: control,
    children: [
      jsx.jsxs('button', {
        type: 'button', className: `q chat-standing-toggle${open ? ' on' : ''}`,
        ref: trigger, 'aria-expanded': open, 'aria-controls': popupId,
        title: '선택한 캐릭터의 스탠딩 명령어', onClick: () => setOpen((value) => !value),
        children: [jsx.jsx(Icon, { name: 'face', size: 13 }), ' 스탠딩']
      }),
      open && jsx.jsxs('div', {
        id: popupId, className: 'chat-standing-popover', role: 'group', 'aria-label': '스탠딩 명령어',
        children: [
          jsx.jsxs('div', {
            className: 'chat-standing-heading',
            children: ['스탠딩 명령어', jsx.jsx('span', {
              className: 'chat-standing-caption', children: character ? `${character.info.name || '이름 없음'} · ${commands.length}개` : '캐릭터 미선택'
            })]
          }),
          commands.length ? jsx.jsx('div', {
            className: 'chat-standing-commands',
            children: commands.map(({ command, index }) => jsx.jsx('button', {
              type: 'button', className: 'q', title: `${command} · 문장 끝에 추가`,
              'aria-label': `${command} 문장 끝에 추가`,
              onClick: () => select(command), children: command
            }, index))
          }) : jsx.jsx('div', {
            className: 'chat-standing-empty',
            children: character ? '등록된 스탠딩 명령어가 없습니다.' : '발화할 캐릭터를 먼저 선택해 주세요.'
          })
        ]
      })
    ]
  })
}
