import type { Category } from '../types'
import { PALETTE, type PlannerDispatch } from '../store'
import { uid } from '../lib/schedule'

export function Categories({ categories, dispatch }: { categories: Category[]; dispatch: PlannerDispatch }) {
  const save = (category: Category) => dispatch({ type: 'saveCategory', category })
  const nextColor = (color: string) => PALETTE[(PALETTE.indexOf(color) + 1) % PALETTE.length]

  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Категории</h2>
        <button
          className="icon-btn"
          aria-label="Новая категория"
          onClick={() => save({ id: uid(), name: 'Новая', color: PALETTE[categories.length % PALETTE.length] })}
        >
          +
        </button>
      </header>

      <ul className="cat-list">
        {categories.map((c) => (
          <li key={c.id} className="cat">
            <button
              className="swatch"
              style={{ background: c.color }}
              aria-label="Сменить цвет"
              onClick={() => save({ ...c, color: nextColor(c.color) })}
            />
            <input value={c.name} aria-label="Название категории" onChange={(e) => save({ ...c, name: e.target.value })} />
            <button className="icon-btn remove" aria-label="Удалить категорию" onClick={() => dispatch({ type: 'deleteCategory', id: c.id })}>
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
