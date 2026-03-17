import { useState, useRef, useEffect } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const PRESET_EMOJIS = ['💧', '🏃', '📚', '🧘', '🚫', '💊', '🏊', '🥗', '😴', '✍️', '🎯', '🧹']
const PRESET_COLORS = ['#5288c1', '#6BC597', '#E07A5F', '#C4A0D4', '#F4A23C', '#E07AB0']
const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const MONTH_NAMES_GEN = [
  'январе', 'феврале', 'марте', 'апреле', 'мае', 'июне',
  'июле', 'августе', 'сентябре', 'октябре', 'ноябре', 'декабре'
]
const MONTH_NAMES_NOM = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Возвращает массив строк "YYYY-MM-DD" для всех дней месяца */
function getDaysInMonth(year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })
}

/** День недели строки YYYY-MM-DD: 1=Пн … 7=Вс */
function getDayOfWeek(dateStr) {
  const d = new Date(dateStr)
  return d.getDay() === 0 ? 7 : d.getDay()
}

function isDone(routine, dateStr) {
  return !!(routine.completions && routine.completions[dateStr])
}

function isScheduled(routine, dateStr) {
  if (!routine.days || routine.days.length === 0) return true
  return routine.days.includes(getDayOfWeek(dateStr))
}

/** Текущая серия выполнения (считаем до сегодня включительно) */
function getStreak(routine) {
  const today = new Date().toISOString().slice(0, 10)
  let streak = 0
  const d = new Date(today)
  while (true) {
    const dateStr = d.toISOString().slice(0, 10)
    if (!isScheduled(routine, dateStr)) {
      d.setDate(d.getDate() - 1)
      continue
    }
    if (!isDone(routine, dateStr)) break
    streak++
    d.setDate(d.getDate() - 1)
    if (streak > 365) break
  }
  return streak
}

/** % выполнения за месяц */
function getMonthPct(routine, year, month) {
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth(year, month).filter(d => d <= today)
  const scheduled = days.filter(d => isScheduled(routine, d))
  if (scheduled.length === 0) return 0
  const done = scheduled.filter(d => isDone(routine, d)).length
  return Math.round((done / scheduled.length) * 100)
}

/** Количество выполнений и пропусков в месяце */
function getMonthStats(routine, year, month) {
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth(year, month).filter(d => d <= today && isScheduled(routine, d))
  const done = days.filter(d => isDone(routine, d)).length
  return { done, missed: days.length - done }
}

/** % продуктивности за конкретный день (все привычки) */
function getDayScore(routines, dateStr) {
  const scheduled = routines.filter(r => isScheduled(r, dateStr))
  if (scheduled.length === 0) return null
  const done = scheduled.filter(r => isDone(r, dateStr)).length
  return done / scheduled.length
}

// ── ProductivityChart ─────────────────────────────────────────────────────────
function ProductivityChart({ routines, year, month }) {
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth(year, month).filter(d => d <= today)
  if (days.length === 0) return null

  const scores = days.map(d => getDayScore(routines, d) ?? 0)
  const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100) : 0

  const W = 200
  const H = 50
  const barW = Math.max(3, Math.floor((W - 2) / days.length) - 1)
  const step = (W - 2) / Math.max(days.length - 1, 1)

  // Точки линии
  const points = scores.map((s, i) => {
    const x = days.length === 1 ? W / 2 : 1 + i * step
    const y = H - 4 - s * (H - 12)
    return { x, y, s }
  })
  const polylineStr = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = points.length > 1
    ? `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} ` +
      points.slice(1).map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') +
      ` L${points[points.length - 1].x.toFixed(1)},${H} L${points[0].x.toFixed(1)},${H} Z`
    : ''

  const todayIdx = days.length - 1
  const todayX = points[todayIdx]?.x ?? W - 1
  const todayY = points[todayIdx]?.y ?? H / 2

  // Подписи оси X
  const labels = []
  labels.push({ x: 1, text: '1', today: false })
  if (days.length >= 10) labels.push({ x: 1 + 9 * step, text: '10', today: false })
  if (days.length >= 15) labels.push({ x: 1 + 14 * step, text: '15', today: false })
  labels.push({ x: todayX, text: String(days.length), today: true })

  return (
    <div className="routine-chart-card">
      <div className="routine-chart-header">
        <span>📈 Продуктивность за месяц</span>
        <span className="routine-chart-avg">ср. {avgScore}%</span>
      </div>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="routineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5288c1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#5288c1" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Bars */}
        {days.map((d, i) => {
          const x = 1 + i * step - barW / 2
          const barH = Math.max(4, scores[i] * (H - 8))
          return <rect key={d} x={x.toFixed(1)} y={(H - barH).toFixed(1)} width={barW} height={barH.toFixed(1)} rx="2" fill="#5288c1" opacity="0.12" />
        })}
        {/* Area */}
        {areaPath && <path d={areaPath} fill="url(#routineAreaGrad)" />}
        {/* Line */}
        {points.length > 1 && (
          <polyline points={polylineStr} fill="none" stroke="#5288c1" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        )}
        {/* Today marker */}
        <line x1={todayX.toFixed(1)} y1="0" x2={todayX.toFixed(1)} y2={H} stroke="#5288c1" strokeWidth="0.8" strokeDasharray="3 2" />
        <circle cx={todayX.toFixed(1)} cy={todayY.toFixed(1)} r="3.5" fill="white" stroke="#5288c1" strokeWidth="1.8" />
        {/* X labels */}
        {labels.map((l, i) => (
          <text key={i} x={l.x.toFixed(1)} y={H - 1} fontSize="6" fill={l.today ? '#5288c1' : '#555'} fontFamily="sans-serif" fontWeight={l.today ? '600' : undefined}>
            {l.text}
          </text>
        ))}
      </svg>
    </div>
  )
}

// ── HabitRow ──────────────────────────────────────────────────────────────────
function HabitRow({ habit, visibleDays, today, onTapName, onToggle }) {
  return (
    <div className="routine-habit-row">
      <div className="routine-habit-name" onClick={onTapName}>
        {habit.emoji} {habit.name}
      </div>
      <div className="routine-cells">
        {visibleDays.map(dateStr => {
          const done = isDone(habit, dateStr)
          const isToday = dateStr === today
          const scheduled = isScheduled(habit, dateStr)
          return (
            <div
              key={dateStr}
              className={`routine-cell${done ? ' done' : ''}${isToday && done ? ' today-done' : ''}${isToday && !done ? ' today-empty' : ''}${!scheduled ? ' off' : ''}`}
              style={done ? { background: habit.color } : undefined}
              onClick={() => scheduled && onToggle(dateStr)}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── HabitAddForm ──────────────────────────────────────────────────────────────
function HabitAddForm({ onSave, onClose, nextOrder, initial }) {
  const [name, setName] = useState(initial?.name || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '🎯')
  const [color, setColor] = useState(initial?.color || PRESET_COLORS[0])
  const [selectedDays, setSelectedDays] = useState(initial?.days || [1, 2, 3, 4, 5, 6, 7])

  const toggleDay = (d) => {
    setSelectedDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort()
    )
  }

  const handleSave = () => {
    if (!name.trim()) return
    const today = new Date().toISOString().slice(0, 10)
    onSave({
      id: initial?.id || Date.now().toString(),
      name: name.trim(),
      emoji,
      color,
      days: selectedDays,
      completions: initial?.completions || {},
      createdAt: initial?.createdAt || today,
      order: initial?.order ?? nextOrder,
    })
    onClose()
  }

  return (
    <div className="goal-modal-overlay" onClick={onClose}>
      <div className="goal-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="goal-modal-handle" />
        <h3 className="goal-modal-title">{initial ? 'Редактировать' : 'Новая привычка'}</h3>

        {/* Название */}
        <div className="goal-form-row">
          <span className="routine-form-emoji-preview">{emoji}</span>
          <input
            className="goal-form-input goal-form-name"
            placeholder="Название привычки"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {/* Иконка */}
        <div>
          <div className="goal-form-label">Иконка</div>
          <div className="routine-emoji-row">
            {PRESET_EMOJIS.map(e => (
              <div
                key={e}
                className={`routine-emoji-chip${emoji === e ? ' sel' : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </div>
            ))}
          </div>
        </div>

        {/* Цвет */}
        <div>
          <div className="goal-form-label">Цвет</div>
          <div className="routine-color-row">
            {PRESET_COLORS.map(c => (
              <div
                key={c}
                className={`routine-color-dot${color === c ? ' sel' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Дни недели */}
        <div>
          <div className="goal-form-label">Дни недели</div>
          <div className="routine-days-row">
            {DAY_NAMES.map((name, i) => {
              const d = i + 1
              return (
                <div
                  key={d}
                  className={`routine-day-chip${selectedDays.includes(d) ? ' sel' : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {name}
                </div>
              )
            })}
          </div>
        </div>

        <button className="goal-btn goal-btn--primary" onClick={handleSave} disabled={!name.trim()}>
          {initial ? 'Сохранить' : 'Добавить привычку'}
        </button>
      </div>
    </div>
  )
}

// ── HabitDetailSheet ──────────────────────────────────────────────────────────
function HabitDetailSheet({ habit, onClose, onUpdate, onDelete, viewMonth }) {
  const [editing, setEditing] = useState(false)
  const { year, month } = viewMonth
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth(year, month)

  const pct = getMonthPct(habit, year, month)
  const streak = getStreak(habit)
  const { done, missed } = getMonthStats(habit, year, month)
  const monthNameGen = MONTH_NAMES_GEN[month]

  if (editing) {
    return (
      <HabitAddForm
        onSave={(updated) => { onUpdate(habit.id, updated); setEditing(false) }}
        onClose={() => setEditing(false)}
        nextOrder={habit.order}
        initial={habit}
      />
    )
  }

  // Барный SVG по дням месяца (только прошедшие)
  const pastDays = days.filter(d => d <= today)
  const BAR_W = 200
  const step = BAR_W / Math.max(pastDays.length, 1)
  const bw = Math.max(3, step - 1.5)

  return (
    <div className="goal-modal-overlay" onClick={onClose}>
      <div className="goal-modal-sheet habit-detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="goal-modal-handle" />

        {/* Шапка */}
        <div className="habit-detail-top">
          <button className="habit-back-btn" onClick={onClose}>← Назад</button>
          <span className="habit-detail-title">{habit.emoji} {habit.name}</span>
          <button className="habit-edit-btn" onClick={() => setEditing(true)}>Ред.</button>
        </div>

        {/* Большой процент */}
        <div className="habit-big-stat">
          <div className="habit-big-pct" style={{ color: habit.color }}>{pct}%</div>
          <div className="habit-big-sub">выполнение в {monthNameGen}</div>
          <div className="habit-mini-stats">
            <div className="habit-mini-stat">
              <div className="habit-mini-val">🔥 {streak}</div>
              <div className="habit-mini-key">серия</div>
            </div>
            <div className="habit-mini-stat">
              <div className="habit-mini-val">{done}</div>
              <div className="habit-mini-key">выполнено</div>
            </div>
            <div className="habit-mini-stat">
              <div className="habit-mini-val">{missed}</div>
              <div className="habit-mini-key">пропущено</div>
            </div>
          </div>
        </div>

        {/* Барный SVG по дням */}
        <div className="routine-chart-card">
          <div className="routine-chart-header">
            <span>Выполнение по дням</span>
          </div>
          <svg width="100%" viewBox={`0 0 ${BAR_W} 40`} xmlns="http://www.w3.org/2000/svg">
            {pastDays.map((d, i) => {
              const x = i * step
              const scheduled = isScheduled(habit, d)
              const done = isDone(habit, d)
              return (
                <rect
                  key={d}
                  x={x.toFixed(1)} y={done ? '4' : '16'}
                  width={bw.toFixed(1)} height={done ? '34' : '20'}
                  rx="2"
                  fill={done ? habit.color : 'var(--tg-theme-secondary-bg-color, #2b2b2b)'}
                  opacity={!scheduled ? 0.3 : 1}
                />
              )
            })}
            <text x="1" y="39" fontSize="6" fill="#555" fontFamily="sans-serif">1</text>
            {pastDays.length >= 10 && (
              <text x={(9 * step).toFixed(1)} y="39" fontSize="6" fill="#555" fontFamily="sans-serif">10</text>
            )}
            <text x={((pastDays.length - 1) * step).toFixed(1)} y="39" fontSize="6" fill={habit.color} fontFamily="sans-serif" fontWeight="600">
              {pastDays.length}
            </text>
          </svg>
        </div>

        {/* Полная карта месяца */}
        <div className="routine-chart-card">
          <div className="routine-chart-header">
            <span>Полная карта месяца</span>
          </div>
          <div className="habit-month-grid">
            {days.map(d => {
              const doneDay = isDone(habit, d)
              const isToday = d === today
              const future = d > today
              return (
                <div
                  key={d}
                  className={`habit-month-cell${isToday ? ' today' : ''}${future ? ' future' : ''}`}
                  style={doneDay ? { background: habit.color, borderColor: 'transparent' } : undefined}
                />
              )
            })}
          </div>
        </div>

        {/* Удалить */}
        <button
          className="goal-btn"
          style={{ background: 'rgba(220,53,69,0.15)', color: '#e53935' }}
          onClick={() => { onDelete(habit.id); onClose() }}
        >
          Удалить привычку
        </button>
      </div>
    </div>
  )
}

// ── RoutineBoard (основной) ───────────────────────────────────────────────────
export default function RoutineBoard({ routines, onAdd, onUpdate, onDelete, onToggleDay }) {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const cellsScrollRef = useRef(null)

  const today = now.toISOString().slice(0, 10)
  const { year, month } = viewMonth

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const currentDayOfMonth = viewMonth.year === now.getFullYear() && viewMonth.month === now.getMonth()
    ? now.getDate()
    : daysInMonth

  const prevMonth = () => setViewMonth(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
  )
  const nextMonth = () => setViewMonth(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
  )

  // Все дни месяца в сетке
  const allDays = getDaysInMonth(year, month)
  const visibleDays = allDays

  // Скролл к сегодняшней ячейке при монтировании и смене месяца
  useEffect(() => {
    const el = cellsScrollRef.current
    if (!el) return
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
    if (!isCurrentMonth) {
      el.scrollLeft = 0
      return
    }
    // Ширина ячейки (20px) + gap (2px) = 22px на ячейку
    const CELL_W = 22
    const todayIdx = now.getDate() - 1
    // Центрируем сегодня в видимой области
    const scrollTo = todayIdx * CELL_W - el.clientWidth / 2 + CELL_W / 2
    el.scrollLeft = Math.max(0, scrollTo)
  }, [year, month])

  // Статистики
  const maxStreak = routines.length ? Math.max(...routines.map(r => getStreak(r))) : 0
  const record = maxStreak
  const monthPctAll = routines.length
    ? Math.round(routines.map(r => getMonthPct(r, year, month)).reduce((a, b) => a + b, 0) / routines.length)
    : 0
  const todayScheduled = routines.filter(r => isScheduled(r, today))
  const todayDone = todayScheduled.filter(r => isDone(r, today)).length
  const todayTotal = todayScheduled.length

  return (
    <div className="routine-wrapper">
      {/* Шапка */}
      <div className="routine-header">
        <div>
          <div className="routine-month-name">{MONTH_NAMES_NOM[month]} {year}</div>
          <div className="routine-month-sub">{currentDayOfMonth} из {daysInMonth} дня</div>
        </div>
        <div className="routine-header-actions">
          <button className="routine-nav-btn" onClick={prevMonth}>‹</button>
          <button className="routine-nav-btn" onClick={nextMonth}>›</button>
          <button className="routine-add-btn" onClick={() => setShowAddForm(true)}>+ Привычка</button>
        </div>
      </div>

      {/* Статистики */}
      <div className="routine-stats">
        <div className="routine-stat">
          <div className="routine-stat-val">🔥 {maxStreak}</div>
          <div className="routine-stat-key">Серия</div>
        </div>
        <div className="routine-stat">
          <div className="routine-stat-val">{monthPctAll}%</div>
          <div className="routine-stat-key">Месяц</div>
        </div>
        <div className="routine-stat">
          <div className="routine-stat-val">{todayDone} / {todayTotal}</div>
          <div className="routine-stat-key">Сегодня</div>
        </div>
        <div className="routine-stat">
          <div className="routine-stat-val">🏆 {record}</div>
          <div className="routine-stat-key">Рекорд</div>
        </div>
      </div>

      {/* Скролл-область */}
      <div className="routine-scroll">
        {/* График */}
        {routines.length > 0 && (
          <ProductivityChart routines={routines} year={year} month={month} />
        )}

        {/* Сетка привычек */}
        <div className="routine-grid-card">
          {/* Строка: фиксированная колонка имён + скролл-область ячеек */}
          <div className="routine-grid-inner">
            {/* Левая фиксированная колонка */}
            <div className="routine-names-col">
              {/* Пустая шапка над именами */}
              {routines.length > 0 && <div className="routine-names-head" />}
              {routines.map(habit => (
                <div
                  key={habit.id}
                  className="routine-habit-name"
                  onClick={() => setSelectedHabit(habit)}
                >
                  {habit.emoji} {habit.name}
                </div>
              ))}
            </div>

            {/* Правая скролл-область (числа + ячейки) */}
            <div className="routine-cells-scroll" ref={cellsScrollRef}>
              {/* Числа дней */}
              {routines.length > 0 && (
                <div className="routine-day-nums">
                  {visibleDays.map(d => {
                    const dayNum = parseInt(d.slice(8), 10)
                    const isToday = d === today
                    return (
                      <div key={d} className={`routine-day-num${isToday ? ' today' : ''}`}>
                        {dayNum}
                      </div>
                    )
                  })}
                </div>
              )}
              {/* Ряды ячеек */}
              {routines.map(habit => (
                <div key={habit.id} className="routine-cells">
                  {visibleDays.map(dateStr => {
                    const done = isDone(habit, dateStr)
                    const isToday = dateStr === today
                    const scheduled = isScheduled(habit, dateStr)
                    return (
                      <div
                        key={dateStr}
                        className={`routine-cell${done ? ' done' : ''}${isToday && done ? ' today-done' : ''}${isToday && !done ? ' today-empty' : ''}${!scheduled ? ' off' : ''}`}
                        style={done ? { background: habit.color } : undefined}
                        onClick={() => scheduled && onToggleDay(habit.id, dateStr)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Footer — всегда виден, вне скролла */}
          <div className="routine-grid-footer">
            <button className="routine-add-link" onClick={() => setShowAddForm(true)}>+ Привычка</button>
            {routines.length > 0 && (
              <span className="routine-today-score">Сегодня: <b>{todayDone} / {todayTotal}</b></span>
            )}
          </div>

          {routines.length === 0 && (
            <p className="routine-empty-hint">Нажмите «+ Привычка» чтобы начать отслеживать рутину</p>
          )}
        </div>
      </div>

      {showAddForm && (
        <HabitAddForm
          onSave={onAdd}
          onClose={() => setShowAddForm(false)}
          nextOrder={routines.length}
        />
      )}

      {selectedHabit && (
        <HabitDetailSheet
          habit={selectedHabit}
          onClose={() => setSelectedHabit(null)}
          onUpdate={(id, changes) => {
            onUpdate(id, changes)
            setSelectedHabit(prev => ({ ...prev, ...changes }))
          }}
          onDelete={onDelete}
          viewMonth={viewMonth}
        />
      )}
    </div>
  )
}
