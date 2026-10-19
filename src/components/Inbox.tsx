import type { CSSProperties, PointerEvent } from 'react'
import type { Category, Task } from '../types'
import { cx } from '../lib/cx'
import { formatDuration, formatShortDate, toKey } from '../lib/time'

interface Props {
  tasks: Task[]
  categories: Category[]
  highlight: boolean
  onAdd: () => void
  onDragStart: (e: PointerEvent, task: Task) => void
}

export function Inbox({ tasks, categories, highlight, onAdd, onDragStart }: Props) {
  const items = tasks.filter((t) => !t.slot)
  const today = toKey(new Date())
  const colorOf = (id: string | null) => categories.find((c) => c.id === id)?.color ?? 'var(--neutral)'

  return (
    <section className={cx('panel inbox', highlight && 'drop')} data-inbox>
      <header className="panel-head">
        <h2>
          Входящие <span className="count">{items.length}</span>
        </h2>
        <button className="icon-btn" aria-label="Новая задача" onClick={onAdd}>
          +
        </button>
      </header>

      {items.length === 0 ? (
        <p className="empty">Пусто. Сюда попадают задачи без времени</p>
      ) : (
        <ul className="inbox-list">
          {items.map((task, i) => (
            <li
              key={task.id}
              data-task-id={task.id}
              className="inbox-item"
              style={{ '--c': colorOf(task.categoryId), '--i': i } as CSSProperties}
              onPointerDown={(e) => onDragStart(e, task)}
            >
              <span className="inbox-title">{task.title}</span>
              <span className="meta">
                {formatDuration(task.duration)}
                {task.priority === 3 && <span className="important">важно</span>}
                {task.deadline && (
                  <span className={cx('deadline', task.deadline < today && 'late')}>
                    до {formatShortDate(task.deadline)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">Перетащите задачу в календарь или поставьте всё сразу кнопкой «Распланировать входящие». С зажатым Alt перетаскивается копия</p>
    </section>
  )
}
