import { j as jsx, I as Icon, E as useSession } from './index-DnAfYmnE.js'

export function VnStandingControls({ standings, onClose }) {
  const gm = useSession((state) => state.self?.role === 'GM')
  const setHidden = useSession((state) => state.hideVnStandings)
  if (!gm || !standings.length) return null

  const change = (messageIds, hidden) => { setHidden(messageIds, hidden); onClose?.() }
  const visible = standings.filter((standing) => !standing.hidden)
  return jsx.jsxs(jsx.Fragment, {
    children: [
      jsx.jsx('div', { className: 'scene-sep' }),
      ...standings.map((standing) => jsx.jsxs('button', {
        type: 'button', className: 'tokenmenu-item',
        title: `${standing.name || '이름 없음'} 스탠딩과 현재 대화창 ${standing.hidden ? '표시' : '숨기기'} (전원 적용)`,
        onClick: () => change([standing.messageId], !standing.hidden),
        children: [
          jsx.jsx(Icon, { name: standing.hidden ? 'visibility_off' : 'person', size: 16 }),
          ` ${standing.name || '이름 없음'}`,
          jsx.jsx('span', { className: 'vn-standing-status muted small', children: standing.hidden ? '숨김' : '표시 중' })
        ]
      }, standing.key)),
      standings.length > 1 && jsx.jsx('div', { className: 'scene-sep' }),
      standings.length > 1 && jsx.jsxs('button', {
        type: 'button', className: 'tokenmenu-item', disabled: !visible.length,
        onClick: () => change(visible.map((standing) => standing.messageId), true),
        children: [jsx.jsx(Icon, { name: 'person_remove', size: 16 }), ' 전체 스탠딩 내리기']
      })
    ]
  })
}
