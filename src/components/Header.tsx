import { addDays, PLAN_FROM, PLAN_TO, formatTime, startOfWeek, weekLabel } from '../lib/time'

interface Props {
  monday: Date
  inboxCount: number
  onWeek: (monday: Date) => void
  onAdd: () => void
  onPlan: () => void
}

const PLAN_TIP =
  `Берёт задачи из списка Задачи и ставит их в свободное время этой недели с ${formatTime(PLAN_FROM)} до ${formatTime(PLAN_TO)}. ` +
  'Сначала задачи с ближайшим дедлайном, потом более важные.'

export function Header({ monday, inboxCount, onWeek, onAdd, onPlan }: Props) {
  const label = weekLabel(monday)

  return (
    <header className="topbar">
      <span className="app-name">Расписание</span>

      <nav className="week-nav">
        <button className="icon-btn" aria-label="Прошлая неделя" onClick={() => onWeek(addDays(monday, -7))}>
          ‹
        </button>
        <button className="btn ghost" onClick={() => onWeek(startOfWeek(new Date()))}>
          Сегодня
        </button>
        <button className="icon-btn" aria-label="Следующая неделя" onClick={() => onWeek(addDays(monday, 7))}>
          ›
        </button>
        <h1 className="week-label" key={label}>
          {label}
        </h1>
      </nav>

      <div className="actions">
        <button className="btn" onClick={onAdd}>
          Новая задача
        </button>
        <span className="tip" data-tip={PLAN_TIP}>
          <button className="btn primary" disabled={!inboxCount} onClick={onPlan} aria-describedby="plan-tip">
            Распланировать задачи
            {inboxCount > 0 && <span className="badge">{inboxCount}</span>}
          </button>
          <span id="plan-tip" hidden>
            {PLAN_TIP}
          </span>
        </span>
      </div>
    </header>
  )
}
