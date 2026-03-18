import { useState, useRef, useEffect } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const PRESET_EMOJIS = ['💧', '🏃', '📚', '🧘', '🚫', '💊', '💪', '🥗', '☀️', '🎯', '🎸', '🖊']
const PRESET_COLORS = ['#4FA3E0', '#6BC597', '#E07A5F', '#C4A0D4', '#F4A23C', '#E07AB0', '#5BC4C4', '#A0C44F']
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

function getDaysInMonth(year, month) {
  const count = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: count }, (_, i) => {
    const d = i + 1
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  })
}

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

/** Последние 12 прошедших дней + до 3 будущих */
function getVisibleDays(year, month) {
  const today = new Date().toISOString().slice(0, 10)
  const all = getDaysInMonth(year, month)
  const past = all.filter(d => d <= today)
  const future = all.filter(d => d > today).slice(0, 3)
  return [...past.slice(-12), ...future]
}

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

function getMonthPct(routine, year, month) {
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth(year, month).filter(d => d <= today)
  const scheduled = days.filter(d => isScheduled(routine, d))
  if (scheduled.length === 0) return 0
  const done = scheduled.filter(d => isDone(routine, d)).length
  return Math.round((done / scheduled.length) * 100)
}

function getMonthStats(routine, year, month) {
  const today = new Date().toISOString().slice(0, 10)
  const days = getDaysInMonth(year, month).filter(d => d <= today && isScheduled(routine, d))
  const done = days.filter(d => isDone(routine, d)).length
  return { done, missed: days.length - done }
}

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
  const avgScore = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 100)
    : 0

  const W = 320, H = 52
  const padL = 0, padR = 0, padT = 4, padB = 16
  const chartW = W - padL - padR
  const chartH = H - padT - padB
  const n = days.length
  const xStep = chartW / (n - 1 || 1)

  const xAt = i => padL + i * xStep
  const yAt = v => padT + chartH - (v / 100) * chartH

  const pcts = days.map(d => getDayScore(routines, d))
  const validPcts = pcts.map((v, i) => v !== null ? { x: xAt(i), y: yAt((v ?? 0) * 100), v: (v ?? 0) * 100 } : null).filter(Boolean)

  const todayIdx = days.indexOf(today)
  const todayX = todayIdx >= 0 ? xAt(todayIdx) : W - 1
  const todayPt = validPcts.find((_, i) => days[pcts.indexOf(pcts[i], i)] === today) || validPcts[validPcts.length - 1]
  const todayY = todayPt ? todayPt.y : H / 2

  const gradId = `hbChartGrad${year}${month}`

  return (
    <div className="hb-card">
      <div className="hb-card-header">
        <span className="hb-card-title">📈 Продуктивность за месяц</span>
        <span className="hb-card-badge">ср. {avgScore}%</span>
      </div>
      <div className="hb-chart-wrap">
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4FA3E0" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#4FA3E0" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {/* Area */}
          {validPcts.length >= 2 && (() => {
            let area = `M${validPcts[0].x},${H - padB} `
            validPcts.forEach(p => { area += `L${p.x},${p.y} ` })
            area += `L${validPcts[validPcts.length - 1].x},${H - padB} Z`
            return <path d={area} fill={`url(#${gradId})`} />
          })()}
          {/* Smooth Bezier line */}
          {validPcts.length >= 2 && (() => {
            let line = `M${validPcts[0].x},${validPcts[0].y}`
            for (let i = 1; i < validPcts.length; i++) {
              const prev = validPcts[i - 1], curr = validPcts[i]
              const cpx = (prev.x + curr.x) / 2
              line += ` C${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`
            }
            return <path d={line} fill="none" stroke="#4FA3E0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          })()}
          {/* Dots */}
          {validPcts.map((p, i) => {
            const isT = days[i] === today
            if (i === 0 || i === validPcts.length - 1 || isT) {
              return isT
                ? <circle key={i} cx={p.x} cy={p.y} r="4" fill="white" stroke="#4FA3E0" strokeWidth="2" />
                : <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#4FA3E0" opacity="0.7" />
            }
            return null
          })}
          {/* Today vertical line */}
          {todayIdx >= 0 && (
            <line x1={todayX} y1={padT} x2={todayX} y2={H - padB}
              stroke="#4FA3E0" strokeWidth="0.8" strokeDasharray="3 2" opacity="0.5" />
          )}
          {/* X labels */}
          {[1, Math.ceil(n / 2), n].map(day => {
            const i = day - 1
            const x = xAt(i)
            const isT = days[i] === today
            return (
              <text key={day} x={x} y={H - 1} textAnchor="middle" fontSize="8"
                fill={isT ? '#4FA3E0' : '#C4C2BA'}
                fontFamily="system-ui,sans-serif"
                fontWeight={isT ? '700' : '400'}>
                {day}
              </text>
            )
          })}
        </svg>
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
    <>
      <div className="hb-backdrop" onClick={onClose} />
      <div className="hb-sheet" onClick={e => e.stopPropagation()}>
        <div className="hb-sheet-handle" />
        <div className="hb-sh-head">
          <div className="hb-sh-title">{initial ? 'Редактировать' : 'Новая привычка'}</div>
          <div className="hb-sh-close" onClick={onClose}>✕</div>
        </div>
        <div className="hb-form-body">
          {/* Название */}
          <div>
            <div className="hb-fl">НАЗВАНИЕ</div>
            <input
              className="hb-fi"
              placeholder="Например: Вода 2 литра"
              maxLength={40}
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          {/* Иконка */}
          <div>
            <div className="hb-fl">ИКОНКА</div>
            <div className="hb-emoji-row">
              {PRESET_EMOJIS.map(e => (
                <div
                  key={e}
                  className={`hb-emoji-chip${emoji === e ? ' sel' : ''}`}
                  onClick={() => setEmoji(e)}
                >
                  {e}
                </div>
              ))}
            </div>
          </div>
          {/* Цвет */}
          <div>
            <div className="hb-fl">ЦВЕТ</div>
            <div className="hb-color-row">
              {PRESET_COLORS.map(c => (
                <div
                  key={c}
                  className={`hb-color-dot${color === c ? ' sel' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>
          {/* Дни недели */}
          <div>
            <div className="hb-fl">ДНИ НЕДЕЛИ</div>
            <div className="hb-days-row">
              {DAY_NAMES.map((n, i) => {
                const d = i + 1
                return (
                  <div
                    key={d}
                    className={`hb-day-chip${selectedDays.includes(d) ? ' sel' : ''}`}
                    onClick={() => toggleDay(d)}
                  >
                    {n}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
        <button
          className="hb-sheet-cta"
          onClick={handleSave}
          disabled={!name.trim()}
        >
          ✓ {initial ? 'Сохранить' : 'Добавить привычку'}
        </button>
      </div>
    </>
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
  const monthLabel = `${MONTH_NAMES_NOM[month].slice(0, 3)} ${year}`

  const daysLabel = habit.days?.length === 7
    ? 'Каждый день'
    : (habit.days || []).map(d => DAY_NAMES[d - 1]).join(', ')

  if (editing) {
    return (
      <HabitAddForm
        onSave={updated => { onUpdate(habit.id, updated); setEditing(false) }}
        onClose={() => setEditing(false)}
        nextOrder={habit.order}
        initial={habit}
      />
    )
  }

  // Bar chart SVG
  const pastDays = days.filter(d => d <= today)
  const BAR_W = 280, BAR_H = 40
  const n = days.length
  const barW = Math.floor((BAR_W - (n - 1) * 2) / n)

  return (
    <>
      <div className="hb-backdrop" onClick={onClose} />
      <div className="hb-sheet hb-detail-sheet" onClick={e => e.stopPropagation()}>
        <div className="hb-sheet-handle" />

        {/* Hero */}
        <div className="hb-detail-hero">
          <div className="hb-dh-top">
            <div className="hb-hero-icon" style={{ background: habit.color + '22' }}>
              {habit.emoji}
            </div>
            <div>
              <div className="hb-hero-name">{habit.name}</div>
              <div className="hb-hero-sub">{daysLabel}</div>
            </div>
          </div>
          <div className="hb-hero-stats">
            <div className="hb-hs">
              <div className="hb-hs-v">🔥 {streak}</div>
              <div className="hb-hs-k">Серия</div>
            </div>
            <div className="hb-hs">
              <div className="hb-hs-v">{done}</div>
              <div className="hb-hs-k">Выполнено</div>
            </div>
            <div className="hb-hs">
              <div className="hb-hs-v">{pct}%</div>
              <div className="hb-hs-k">Процент</div>
            </div>
            <div className="hb-hs">
              <div className="hb-hs-v">{pastDays.length}</div>
              <div className="hb-hs-k">Дней всего</div>
            </div>
          </div>
        </div>

        {/* Bar chart */}
        <div className="hb-detail-section">
          <div className="hb-detail-card">
            <div className="hb-detail-sec-title">
              <span>График выполнения</span>
              <span>{monthLabel}</span>
            </div>
            <svg width="100%" viewBox={`0 0 ${BAR_W} ${BAR_H}`} style={{ display: 'block', marginBottom: 4 }}>
              {days.map((d, i) => {
                const isFuture = d > today
                const doneDay = isDone(habit, d)
                const x = i * (barW + 2)
                const bh = doneDay ? BAR_H - 4 : 8
                const y = BAR_H - bh
                const fill = doneDay ? habit.color : '#F0EEE8'
                const stroke = doneDay ? 'none' : '#E8E6DE'
                const isT = d === today
                return (
                  <g key={d}>
                    <rect x={x} y={y} width={barW} height={bh} rx="2"
                      fill={fill} stroke={stroke} strokeWidth="0.5"
                      opacity={isFuture ? 0.3 : 1} />
                    {isT && (
                      <rect x={x} y="0" width={barW} height={BAR_H} rx="2"
                        fill="none" stroke="#4FA3E0" strokeWidth="1.2" opacity="0.5" />
                    )}
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Mini grid */}
        <div className="hb-detail-section">
          <div className="hb-detail-card">
            <div className="hb-detail-sec-title">
              <span>Карта месяца</span>
              <span>{monthLabel}</span>
            </div>
            <div className="hb-mini-grid">
              {days.map(d => {
                const doneDay = isDone(habit, d)
                const isT = d === today
                const isFuture = d > today
                const dayNum = parseInt(d.slice(8), 10)
                return (
                  <div
                    key={d}
                    className={`hb-mg-cell${doneDay ? ' done' : ''}${isT ? ' today-mg' : ''}`}
                    style={{
                      ...(doneDay ? { background: habit.color, borderColor: 'transparent' } : {}),
                      ...(isFuture ? { opacity: 0.35 } : {}),
                    }}
                  >
                    {!doneDay && (
                      <span style={{ fontSize: 7, color: '#C4C2BA' }}>{dayNum}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="hb-detail-actions">
          <button className="hb-detail-btn edit" onClick={() => setEditing(true)}>
            Редактировать
          </button>
          <button className="hb-detail-btn danger" onClick={() => { onDelete(habit.id); onClose() }}>
            Удалить
          </button>
        </div>
      </div>
    </>
  )
}

// ── RoutineBoard (основной) ───────────────────────────────────────────────────
export default function RoutineBoard({ routines, onAdd, onUpdate, onDelete, onToggleDay }) {
  const now = new Date()
  const [viewMonth, setViewMonth] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [showAddForm, setShowAddForm] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState(null)
  const [poppingCell, setPoppingCell] = useState(null)
  const popTimerRef = useRef(null)

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

  const visibleDays = getVisibleDays(year, month)

  const handleToggle = (habitId, dateStr) => {
    onToggleDay(habitId, dateStr)
    const key = habitId + dateStr
    setPoppingCell(key)
    clearTimeout(popTimerRef.current)
    popTimerRef.current = setTimeout(() => setPoppingCell(null), 250)
  }

  useEffect(() => () => clearTimeout(popTimerRef.current), [])

  // Статистики
  const maxStreak = routines.length ? Math.max(...routines.map(r => getStreak(r))) : 0
  const monthPctAll = routines.length
    ? Math.round(routines.map(r => getMonthPct(r, year, month)).reduce((a, b) => a + b, 0) / routines.length)
    : 0
  const todayScheduled = routines.filter(r => isScheduled(r, today))
  const todayDone = todayScheduled.filter(r => isDone(r, today)).length
  const todayTotal = todayScheduled.length

  return (
    <div className="hb-root">
      {/* Шапка */}
      <div className="hb-header">
        <div className="hb-header-row">
          <div className="hb-month-nav">
            <div className="hb-nav-arr" onClick={prevMonth}>‹</div>
            <div>
              <div className="hb-month-name">{MONTH_NAMES_NOM[month]} {year}</div>
              <div className="hb-month-sub">{currentDayOfMonth} из {daysInMonth} дней</div>
            </div>
            <div className="hb-nav-arr" onClick={nextMonth}>›</div>
          </div>
          <div className="hb-header-actions">
            <button className="hb-btn-add" onClick={() => setShowAddForm(true)}>+ Привычка</button>
          </div>
        </div>

        {/* Статистики */}
        <div className="hb-stats-row">
          <div className="hb-stat-box">
            <div className="hb-stat-v">🔥 {maxStreak}</div>
            <div className="hb-stat-k">Серия</div>
          </div>
          <div className="hb-stat-box">
            <div className="hb-stat-v">{monthPctAll}%</div>
            <div className="hb-stat-k">Месяц</div>
          </div>
          <div className="hb-stat-box">
            <div className="hb-stat-v">{todayDone}/{todayTotal}</div>
            <div className="hb-stat-k">Сегодня</div>
          </div>
          <div className="hb-stat-box">
            <div className="hb-stat-v">{routines.length}</div>
            <div className="hb-stat-k">Привычек</div>
          </div>
        </div>
      </div>

      {/* Скролл-область */}
      <div className="hb-scroll">
        {/* График */}
        {routines.length > 0 && (
          <ProductivityChart routines={routines} year={year} month={month} />
        )}

        {/* Сетка привычек */}
        <div className="hb-grid-card">
          {routines.length > 0 && (
            <>
              {/* Шапка: колонка имён + числа дней */}
              <div className="hb-grid-header">
                <div className="hb-grid-col-head">Привычка</div>
                <div className="hb-day-nums">
                  {visibleDays.map(d => {
                    const dayNum = parseInt(d.slice(8), 10)
                    const isToday = d === today
                    return (
                      <div key={d} className={`hb-dn${isToday ? ' today' : ''}`}>
                        {dayNum}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Строки привычек */}
              {routines.map(habit => (
                <div key={habit.id} className="hb-habit-row">
                  <div className="hb-habit-name-wrap" onClick={() => setSelectedHabit(habit)}>
                    <span className="hb-habit-emoji">{habit.emoji}</span>
                    <span className="hb-habit-name">{habit.name}</span>
                  </div>
                  <div className="hb-habit-cells">
                    {visibleDays.map(dateStr => {
                      const done = isDone(habit, dateStr)
                      const isToday = dateStr === today
                      const scheduled = isScheduled(habit, dateStr)
                      const isFuture = dateStr > today
                      const isPopping = poppingCell === habit.id + dateStr
                      let cls = 'hb-cell'
                      if (!scheduled) cls += ' off'
                      else if (isFuture) cls += ' future'
                      else {
                        if (done) cls += ' done'
                        if (isToday) cls += ' today-ring'
                        if (isPopping) cls += ' popping'
                      }
                      const style = {}
                      if (scheduled && done) style.background = habit.color
                      if (scheduled && isToday && !done) style.outlineColor = habit.color
                      return (
                        <div
                          key={dateStr}
                          className={cls}
                          style={Object.keys(style).length ? style : undefined}
                          onClick={() => scheduled && !isFuture && handleToggle(habit.id, dateStr)}
                        >
                          {scheduled && <div className="hb-checkmark" />}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Footer */}
          <div className="hb-grid-footer">
            <button className="hb-add-link" onClick={() => setShowAddForm(true)}>+ Привычка</button>
            {routines.length > 0 && (
              <span className="hb-today-score">
                Сегодня: <strong>{todayDone} / {todayTotal}</strong>
              </span>
            )}
          </div>

          {routines.length === 0 && (
            <p className="hb-empty">Нажмите «+ Привычка» чтобы начать отслеживать рутину</p>
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
