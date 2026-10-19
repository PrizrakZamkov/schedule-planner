import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type { Occurrence } from '../types'
import type { DragMode } from '../hooks/useTaskDrag'
import { cx } from '../lib/cx'
import { blockPosition, formatTime, STEP } from '../lib/time'

interface Props {
  occ: Occurrence
  lane: number
  lanes: number
  color: string
  lift: { dx: number; dy: number } | null
  onDragStart: (e: PointerEvent, mode: DragMode) => void
  onToggle: () => void
  onOpen: () => void
  onDelete: () => void
  onNudge: (minutes: number, days: number) => void
}

const KEY_MOVES: Record<string, [number, number]> = {
  ArrowUp: [-STEP, 0],
  ArrowDown: [STEP, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

export function TaskBlock({ occ, lane, lanes, color, lift, onDragStart, onToggle, onOpen, onDelete, onNudge }: Props) {
  const { task, start, end, done } = occ

  function handleKey(e: KeyboardEvent) {
    if (KEY_MOVES[e.key]) {
      e.preventDefault()
      onNudge(...KEY_MOVES[e.key])
    } else if (e.key === 'Enter') onOpen()
    else if (e.key === ' ') {
      e.preventDefault()
      onToggle()
    } else if (e.key === 'Delete' || e.key === 'Backspace') onDelete()
  }

  const style = {
    ...blockPosition(start, end),
    left: `calc(${lane} * (100% - 6px) / ${lanes} + 3px)`,
    width: `calc((100% - 6px) / ${lanes} - 2px)`,
    transform: lift ? `translate(${lift.dx}px, ${lift.dy}px)` : undefined,
    '--c': color,
  } as CSSProperties

  return (
    <div
      className={cx('task', done && 'done', lift && 'lifted', lanes > 1 && 'narrow', end - start <= 30 && 'short')}
      style={style}
      data-task-id={task.id}
      tabIndex={0}
      role="button"
      aria-label={`${task.title}, ${formatTime(start)}–${formatTime(end)}`}
      onPointerDown={(e) => onDragStart(e, 'move')}
      onKeyDown={handleKey}
    >
      <button
        className="check"
        aria-label={done ? 'Вернуть в работу' : 'Отметить выполненной'}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onToggle}
      >
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6.2 5 8.5l4.5-5" />
        </svg>
      </button>
      <div className="task-body">
        <span className="task-title">{task.title}</span>
        <span className="task-time">
          {formatTime(start)}–{formatTime(end)}
          {task.repeat && ' ↻'}
        </span>
      </div>
      <div
        className="resize"
        onPointerDown={(e) => {
          e.stopPropagation()
          onDragStart(e, 'resize')
        }}
      />
    </div>
  )
}
