import { r as React, j as jsx } from './index-DnAfYmnE.js'

export const VN_STANDING_EXIT_MS = 420
export const VN_STANDING_ENTER_MS = 500
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

export function reconcileVnStandings(previous, current, reducedMotion = false) {
  const previousByKey = new Map(previous.map((standing) => [standing.key, standing]))
  current = current.filter((standing) => standing.src || previousByKey.has(standing.key))
  const keys = new Set(current.map((standing) => standing.key))
  const exiting = reducedMotion ? [] : previous
    .filter((standing) => !keys.has(standing.key))
    .map((standing) => standing.exitToken ? standing : { ...standing, enterToken: undefined, exitToken: {} })
  const active = current.map((standing, index) => ({
    ...standing,
    x: current.length > 1 ? `${Math.round((index + 1) / (current.length + 1) * 100)}%` : '5%',
    dx: current.length > 1 ? '-50%' : '0',
    enterToken: reducedMotion ? undefined : previousByKey.has(standing.key) && !previousByKey.get(standing.key).exitToken
      ? previousByKey.get(standing.key).enterToken : {},
    exitToken: undefined
  }))
  const next = [...exiting, ...active]
  return next.length === previous.length && next.every((entry, index) => {
    const before = previous[index]
    const fields = Object.keys(entry)
    return fields.length === Object.keys(before).length && fields.every((field) => entry[field] === before[field])
  }) ? previous : next
}

export function VnStandingImage({ entry, active, onAnimationEnd }) {
  const [source, setSource] = React.useState(entry.src)

  React.useEffect(() => {
    if (!entry.src || entry.src === source || entry.exitToken) return
    if (!source) { setSource(entry.src); return }
    let cancelled = false
    const image = new Image()
    const commit = () => { if (!cancelled) setSource(entry.src) }
    image.onload = () => {
      if (cancelled) return
      if (typeof image.decode === 'function') image.decode().then(commit, () => {})
      else commit()
    }
    image.src = entry.src
    return () => {
      cancelled = true
      image.onload = null
    }
  }, [entry.src, entry.exitToken, source])

  return jsx.jsx('img', {
    className: `standing standing-img${active ? ' speaking' : ' idle'}${entry.exitToken ? ' standing-exit' : entry.enterToken ? '' : ' standing-settled'}`,
    src: source ?? entry.src, alt: '', 'aria-hidden': entry.exitToken ? true : undefined,
    decoding: 'async', draggable: false,
    style: {
      ...(entry.height ? { height: `${entry.height}px`, maxHeight: '98%' } : {}),
      '--sx': entry.x, '--sdx': entry.dx
    },
    onAnimationEnd
  })
}

export function VnStandingLayer({ standings, activeKey }) {
  const reducedMotion = globalThis.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false
  const [entries, setEntries] = React.useState(() => reconcileVnStandings([], standings, reducedMotion))
  const timers = React.useRef(new Map())

  React.useLayoutEffect(() => {
    setEntries((previous) => reconcileVnStandings(previous, standings, reducedMotion))
  }, [standings, reducedMotion])

  const finish = (key, phase, token) => {
    setEntries((previous) => phase === 'exitToken'
      ? previous.filter((entry) => entry.key !== key || entry.exitToken !== token)
      : previous.map((entry) => entry.key === key && entry.enterToken === token ? { ...entry, enterToken: undefined } : entry))
  }

  React.useEffect(() => {
    const pending = timers.current
    for (const [key, timer] of pending) {
      if (!entries.some((entry) => entry.key === key && entry[timer.phase] === timer.token)) {
        clearTimeout(timer.id)
        pending.delete(key)
      }
    }
    for (const entry of entries) {
      const phase = entry.exitToken ? 'exitToken' : 'enterToken'
      const token = entry[phase]
      if (!token || pending.has(entry.key)) continue
      const id = setTimeout(() => {
        if (pending.get(entry.key)?.token !== token) return
        pending.delete(entry.key)
        finish(entry.key, phase, token)
      }, phase === 'exitToken' ? VN_STANDING_EXIT_MS : VN_STANDING_ENTER_MS)
      pending.set(entry.key, { id, token, phase })
    }
  }, [entries])

  React.useEffect(() => () => {
    for (const timer of timers.current.values()) clearTimeout(timer.id)
    timers.current.clear()
  }, [])

  return jsx.jsx(jsx.Fragment, {
    children: entries.map((entry) => jsx.jsx(VnStandingImage, {
      entry, active: entry.key === activeKey,
      onAnimationEnd: entry.exitToken || entry.enterToken ? (event) => {
        if (event.target !== event.currentTarget) return
        if (event.animationName === 'standing-out' && entry.exitToken) finish(entry.key, 'exitToken', entry.exitToken)
        if (event.animationName === 'rise' && entry.enterToken) finish(entry.key, 'enterToken', entry.enterToken)
      } : undefined
    }, entry.key))
  })
}
