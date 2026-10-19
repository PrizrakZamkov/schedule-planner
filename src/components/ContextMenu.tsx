import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cx } from '../lib/cx'

export interface MenuItem {
  label: string
  danger?: boolean
  onClick: () => void
}

interface Props {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  // keep the menu inside the window
  useLayoutEffect(() => {
    const menu = ref.current
    if (!menu) return
    const { width, height } = menu.getBoundingClientRect()
    setPos({ x: Math.min(x, innerWidth - width - 8), y: Math.min(y, innerHeight - height - 8) })
    menu.querySelector('button')?.focus()
  }, [x, y])

  useEffect(() => {
    const outside = (e: Event) => !ref.current?.contains(e.target as Node) && onClose()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', outside, true)
    window.addEventListener('wheel', onClose, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('wheel', onClose)
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div ref={ref} className="menu" role="menu" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((item) => (
        <button
          key={item.label}
          role="menuitem"
          className={cx('menu-item', item.danger && 'danger')}
          onClick={() => {
            onClose()
            item.onClick()
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
