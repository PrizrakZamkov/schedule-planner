import { useRef, useState } from 'react'
import type { Slot } from '../types'
import { blockPosition, formatTime } from '../lib/time'

interface Props {
  slot: Slot
  onDone: (title: string | null) => void
  onMore: (title: string) => void
}

// a new block with a title field, appears right where the range was selected
export function DraftBlock({ slot, onDone, onMore }: Props) {
  const [title, setTitle] = useState('')
  const finished = useRef(false)

  function finish(value: string | null) {
    if (finished.current) return
    finished.current = true
    onDone(value?.trim() || null)
  }

  return (
    <div className="draft" style={blockPosition(slot.start, slot.end)}>
      <input
        autoFocus
        placeholder="Название"
        aria-label="Название новой задачи"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() => finish(title)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') finish(title)
          if (e.key === 'Escape') finish(null)
        }}
      />
      <div className="draft-foot">
        <span>
          {formatTime(slot.start)}–{formatTime(slot.end)}
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            finished.current = true
            onMore(title.trim())
          }}
        >
          Подробнее
        </button>
      </div>
    </div>
  )
}
