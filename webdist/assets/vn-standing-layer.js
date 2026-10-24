import { r as React, j as jsx } from './index-DnAfYmnE.js'

export const VN_STANDING_EXIT_MS = 420
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function reconcileVnStandings(previous, current, reducedMotion = false) {
  const keys = new Set(current.map((standing) => standing.key))
  const exiting = reducedMotion ? [] : previous
    .filter((standing) => !keys.has(standing.key))
    .map((standing) => standing.exitToken ? standing : { ...standing, exitToken: {} })
  const active = current.map((standing, index) => ({
    ...standing,
    x: current.length > 1 ? `${Math.round((index + 1) / (current.length + 1) * 100)}%` : '5%',
    dx: current.length > 1 ? '-50%' : '0',
    exitToken: undefined
  }))
  return [...exiting, ...active]
}

export function VnStandingLayer({ standings, activeKey }) {
  const reducedMotion = globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false
  const [entries, setEntries] = React.useState(() => reconcileVnStandings([], standings))
  const timers = React.useRef(new Map())

  React.useLayoutEffect(() => {
    setEntries((previous) => reconcileVnStandings(previous, standings, reducedMotion))
  }, [standings, reducedMotion])

  const finish = (key, token) => {
    setEntries((previous) => previous.filter((entry) => entry.key !== key || entry.exitToken !== token))
  }

  React.useEffect(() => {
    const pending = timers.current
    for (const [key, timer] of pending) {
      if (!entries.some((entry) => entry.key === key && entry.exitToken === timer.token)) {
        clearTimeout(timer.id)
        pending.delete(key)
      }
    }
    for (const entry of entries) {
      if (!entry.exitToken || pending.has(entry.key)) continue
      const token = entry.exitToken
      const id = setTimeout(() => {
        if (pending.get(entry.key)?.token !== token) return
        pending.delete(entry.key)
        finish(entry.key, token)
      }, VN_STANDING_EXIT_MS)
      pending.set(entry.key, { id, token })
    }
  }, [entries])

  React.useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer.id)
    timers.current.clear()
  }, [])

  return jsx.jsx(jsx.Fragment, {
    children: entries.map((entry) => jsx.jsx('img', {
      className: `standing standing-img${entry.key === activeKey ? ' speaking' : ' idle'}${entry.exitToken ? ' standing-exit' : ''}`,
      src: entry.src, alt: '', 'aria-hidden': entry.exitToken ? true : undefined,
      decoding: 'async', draggable: false,
      style: {
        ...(entry.height ? { height: `${entry.height}px`, maxHeight: '98%' } : {}),
        '--sx': entry.x, '--sdx': entry.dx
      },
      onAnimationEnd: entry.exitToken ? (event) => {
        if (event.target === event.currentTarget && event.animationName === 'standing-out') finish(entry.key, entry.exitToken)
      } : undefined
    }, entry.key))
  })
}
