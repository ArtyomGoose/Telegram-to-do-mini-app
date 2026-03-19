import { useState, useRef, useEffect, useCallback } from 'react'

// ── Constants ─────────────────────────────────────────
const CAT_EMOJIS = ['🏋️','🏃','🚴','🤸','⚽','🏊','🧘','🥊','🎾','🏇','🤾','🏄']
const CAT_COLORS = ['#E07A5F','#4FA3E0','#6BC597','#C4A0D4','#F4A23C','#5BC4C4']
const MONTH_NAMES = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']

// ── Helpers ───────────────────────────────────────────
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }
function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}
function p2(n) { return String(n).padStart(2, '0') }
function fmtDate(iso) {
  const [, m, d] = iso.split('-')
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`
}
function fmtDow(iso) {
  const days = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
  return days[new Date(iso).getDay()]
}

function getLogsArray(ex) {
  return Object.values(ex.logs || {}).sort((a, b) => a.date.localeCompare(b.date))
}

function getRecord(ex) {
  const logs = getLogsArray(ex)
  if (!logs.length) return null
  if (ex.type === 'time') return logs.reduce((a, b) => a.val < b.val ? a : b)
  return logs.reduce((a, b) => a.val > b.val ? a : b)
}

function fmtRecordShort(ex) {
  const r = getRecord(ex)
  if (!r) return '—'
  if (ex.type === 'both') return `${r.val} ${ex.unit}`
  return `${r.val} ${ex.unit}`
}

function getDelta(ex) {
  const logs = getLogsArray(ex)
  if (logs.length < 2) return null
  const last = logs[logs.length - 1].val
  const prev = logs[logs.length - 2].val
  return last - prev
}

function getStreak(ex) {
  const logs = getLogsArray(ex)
  const dates = [...new Set(logs.map(l => l.date))].sort().reverse()
  return dates.length
}

function catColor(catId, categories) {
  const c = categories.find(x => x.id === catId)
  return c?.color || CAT_COLORS[0]
}

function catName(catId, categories) {
  const c = categories.find(x => x.id === catId)
  return c ? `${c.emoji} ${c.name}` : '—'
}

function typeLabel(type) {
  if (type === 'both') return 'Вес + повт.'
  if (type === 'time') return 'Время'
  if (type === 'weight') return 'Вес'
  return 'Количество'
}

// ── Swipe-down hook ───────────────────────────────────
function useSwipeDown(ref, onClose) {
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let sy = 0
    const onStart = (e) => { sy = e.touches[0].clientY }
    const onEnd = (e) => {
      const dy = e.changedTouches[0].clientY - sy
      if (dy > 60 && el.scrollTop <= 0) onClose()
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchend', onEnd)
    }
  }, [onClose])
}

// ── Sparkline bars ────────────────────────────────────
function Sparkline({ logs, color }) {
  const vals = logs.slice(-7).map(l => l.val)
  if (!vals.length) return null
  const maxV = Math.max(...vals, 1)
  return (
    <div className="sp-ex-sparkline">
      {vals.map((v, i) => {
        const h = Math.max(3, Math.round(v / maxV * 14))
        return (
          <div
            key={i}
            className="sp-bar"
            style={{ height: h, background: color, opacity: 0.3 + 0.7 * (v / maxV) }}
          />
        )
      })}
    </div>
  )
}

// ── SVG Chart ─────────────────────────────────────────
function Chart({ logs, color }) {
  if (logs.length < 2) {
    return (
      <svg width="100%" viewBox="0 0 280 48" style={{ display: 'block' }}>
        <text x="140" y="28" textAnchor="middle" fontSize="11" fill="#B4B2A9" fontFamily="system-ui">
          Недостаточно данных
        </text>
      </svg>
    )
  }

  const vals = logs.map(l => l.val)
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const range = maxV - minV || 1
  const W = 280, H = 48, pad = 6
  const xStep = (W - pad * 2) / (logs.length - 1)
  const xAt = (i) => pad + i * xStep
  const yAt = (v) => H - pad - ((v - minV) / range) * (H - pad * 2)

  let linePath = `M${xAt(0)},${yAt(vals[0])}`
  for (let i = 1; i < vals.length; i++) {
    const cpx = (xAt(i - 1) + xAt(i)) / 2
    linePath += ` C${cpx},${yAt(vals[i-1])} ${cpx},${yAt(vals[i])} ${xAt(i)},${yAt(vals[i])}`
  }

  let areaPath = `M${xAt(0)},${H - pad} `
  vals.forEach((v, i) => { areaPath += `L${xAt(i)},${yAt(v)} ` })
  areaPath += `L${xAt(vals.length - 1)},${H - pad} Z`

  const gradId = `sg-${color.replace('#', '')}`

  return (
    <svg width="100%" viewBox="0 0 280 48" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      {vals.map((v, i) => {
        const isLast = i === vals.length - 1
        const isPR = v === maxV && !isLast
        if (isLast) {
          return <circle key={i} cx={xAt(i)} cy={yAt(v)} r="4" fill="white" stroke={color} strokeWidth="2" />
        }
        if (isPR) {
          return (
            <g key={i}>
              <circle cx={xAt(i)} cy={yAt(v)} r="3" fill="white" stroke="#6BC597" strokeWidth="2" />
              <text x={xAt(i)} y={yAt(v) - 6} textAnchor="middle" fontSize="8" fill="#6BC597" fontFamily="system-ui">PR</text>
            </g>
          )
        }
        return <circle key={i} cx={xAt(i)} cy={yAt(v)} r="2" fill={color} opacity="0.6" />
      })}
    </svg>
  )
}

// ── Add Category Sheet ────────────────────────────────
function AddCatSheet({ onSave, onUpdate, onClose, categoriesCount, editingCat }) {
  const sheetRef = useRef(null)
  const [name, setName] = useState(editingCat ? editingCat.name : '')
  const [selectedEmoji, setSelectedEmoji] = useState(editingCat ? editingCat.emoji : CAT_EMOJIS[categoriesCount % CAT_EMOJIS.length])

  const handleClose = useCallback(() => onClose(), [onClose])
  useSwipeDown(sheetRef, handleClose)

  const handleSave = () => {
    if (!name.trim()) return
    if (editingCat) {
      onUpdate(editingCat.id, { name: name.trim(), emoji: selectedEmoji })
    } else {
      const color = CAT_COLORS[categoriesCount % CAT_COLORS.length]
      onSave({ id: uid(), name: name.trim(), emoji: selectedEmoji, color })
    }
    onClose()
  }

  return (
    <div ref={sheetRef} className="sp-sheet sp-sheet--open">
      <div className="sp-sh-handle" />
      <div className="sp-sh-head">
        <div className="sp-sh-title">{editingCat ? 'Редактировать категорию' : 'Новая категория'}</div>
        <div className="sp-sh-close" onClick={onClose}>✕</div>
      </div>
      <div className="sp-form-body">
        <div>
          <div className="sp-fl">НАЗВАНИЕ КАТЕГОРИИ</div>
          <input
            type="text"
            className="sp-fi"
            placeholder="Например: Турник, Бег, Зал..."
            maxLength={30}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
        <div>
          <div className="sp-fl">ИКОНКА</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CAT_EMOJIS.map(e => (
              <div
                key={e}
                className={`sp-emoji-chip${selectedEmoji === e ? ' sp-emoji-chip--sel' : ''}`}
                onClick={() => setSelectedEmoji(e)}
              >
                {e}
              </div>
            ))}
          </div>
        </div>
      </div>
      <button className="sp-sh-cta" disabled={!name.trim()} onClick={handleSave}>
        {editingCat ? '✓ Сохранить изменения' : '✓ Создать категорию'}
      </button>
    </div>
  )
}

// ── Add Exercise Sheet ────────────────────────────────
function AddExSheet({ onSave, onClose, categories, editEx, preCatId }) {
  const sheetRef = useRef(null)
  const [name, setName] = useState(editEx?.name || '')
  const [catId, setCatId] = useState(editEx?.catId || preCatId || categories[0]?.id || '')
  const [type, setType] = useState(editEx?.type || 'reps')
  const [unit, setUnit] = useState(editEx?.unit || 'повт.')

  const handleClose = useCallback(() => onClose(), [onClose])
  useSwipeDown(sheetRef, handleClose)

  const typeOptions = [
    { key: 'reps', icon: '🔢', label: 'Количество' },
    { key: 'weight', icon: '⚖️', label: 'Вес (кг)' },
    { key: 'both', icon: '💪', label: 'Вес + Повторения' },
    { key: 'time', icon: '⏱', label: 'Время' },
  ]

  const handleTypeChange = (t) => {
    setType(t)
    const units = { reps: 'повт.', weight: 'кг', both: 'кг', time: 'мин' }
    setUnit(units[t])
  }

  const handleSave = () => {
    if (!name.trim() || !catId) return
    if (editEx) {
      onSave(editEx.id, { name: name.trim(), catId, type, unit })
    } else {
      onSave({ id: uid(), catId, name: name.trim(), type, unit, logs: {} })
    }
    onClose()
  }

  return (
    <div ref={sheetRef} className="sp-sheet sp-sheet--open">
      <div className="sp-sh-handle" />
      <div className="sp-sh-head">
        <div className="sp-sh-title">{editEx ? 'Изменить упражнение' : 'Новое упражнение'}</div>
        <div className="sp-sh-close" onClick={onClose}>✕</div>
      </div>
      <div className="sp-form-body">
        <div>
          <div className="sp-fl">КАТЕГОРИЯ</div>
          <select className="sp-fi" value={catId} onChange={e => setCatId(e.target.value)} style={{ cursor: 'pointer' }}>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <div className="sp-fl">НАЗВАНИЕ</div>
          <input
            type="text"
            className="sp-fi"
            placeholder="Например: Подтягивания, Жим лёжа..."
            maxLength={40}
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div>
          <div className="sp-fl">ТИП РЕЗУЛЬТАТА</div>
          <div className="sp-type-grid">
            {typeOptions.map(opt => (
              <div
                key={opt.key}
                className={`sp-type-chip${type === opt.key ? ' sp-type-chip--sel' : ''}`}
                onClick={() => handleTypeChange(opt.key)}
              >
                <span className="sp-tc-icon">{opt.icon}</span>
                {opt.label}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="sp-fl">ЕДИНИЦА ИЗМЕРЕНИЯ</div>
          <input
            type="text"
            className="sp-fi"
            placeholder="повт., кг, сек, мин..."
            maxLength={10}
            value={unit}
            onChange={e => setUnit(e.target.value)}
          />
        </div>
      </div>
      <button className="sp-sh-cta" disabled={!name.trim() || !catId} onClick={handleSave}>
        {editEx ? '✓ Сохранить' : '✓ Добавить упражнение'}
      </button>
    </div>
  )
}

// ── Add Result Sheet ──────────────────────────────────
function AddResultSheet({ ex, onSave, onClose }) {
  const sheetRef = useRef(null)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState(20)
  const [sets, setSets] = useState(3)
  const [note, setNote] = useState('')

  const handleClose = useCallback(() => onClose(), [onClose])
  useSwipeDown(sheetRef, handleClose)

  const logs = getLogsArray(ex)
  const rec = getRecord(ex)

  const currentVal = ex.type === 'time' ? reps : (ex.type === 'weight' ? weight : reps)
  const isNewRec = rec
    ? (ex.type === 'time' ? currentVal < rec.val : currentVal > rec.val)
    : true

  const adjust = (field, delta) => {
    if (field === 'reps') setReps(v => Math.max(1, Math.round((v + delta) * 10) / 10))
    if (field === 'weight') setWeight(v => Math.max(0, Math.round((v + delta) * 10) / 10))
    if (field === 'sets') setSets(v => Math.max(1, Math.min(20, v + delta)))
  }

  const handleSave = () => {
    const val = ex.type === 'time' ? reps : (ex.type === 'weight' ? weight : reps)
    const val2 = ex.type === 'both' ? reps : null
    onSave(ex.id, { date: todayStr(), val, val2, sets, note: note.trim() })
    onClose()
  }

  const now = new Date()
  const dateStr = `${['Вс','Пн','Вт','Ср','Чт','Пт','Сб'][now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()].toLowerCase()}`

  return (
    <div ref={sheetRef} className="sp-sheet sp-sheet--open sp-sheet--result">
      <div className="sp-sh-handle" />
      <div className="sp-sh-head">
        <div>
          <div className="sp-sh-title">{ex.name}</div>
          <div style={{ fontSize: 11, color: 'var(--sp-muted)', marginTop: 2 }}>{dateStr}</div>
        </div>
        <div className="sp-sh-close" onClick={onClose}>✕</div>
      </div>

      {/* Pickers */}
      <div style={{ padding: '12px 0 0' }}>
        {(ex.type === 'reps' || ex.type === 'time') && (
          <div style={{ padding: '0 16px 12px' }}>
            <div className="sp-dp-label">{ex.type === 'time' ? `ВРЕМЯ (${ex.unit})` : `КОЛИЧЕСТВО (${ex.unit})`}</div>
            <div className="sp-num-picker">
              <div className="sp-np-btn" onClick={() => adjust('reps', -1)}>−</div>
              <div className="sp-np-center">
                <div className="sp-np-val">{reps}</div>
                <div className="sp-np-unit">{ex.unit}</div>
              </div>
              <div className="sp-np-btn" onClick={() => adjust('reps', 1)}>+</div>
            </div>
          </div>
        )}
        {ex.type === 'weight' && (
          <div style={{ padding: '0 16px 12px' }}>
            <div className="sp-dp-label">ВЕС ({ex.unit})</div>
            <div className="sp-num-picker">
              <div className="sp-np-btn" onClick={() => adjust('weight', -2.5)}>−</div>
              <div className="sp-np-center">
                <div className="sp-np-val">{weight}</div>
                <div className="sp-np-unit">{ex.unit}</div>
              </div>
              <div className="sp-np-btn" onClick={() => adjust('weight', 2.5)}>+</div>
            </div>
          </div>
        )}
        {ex.type === 'both' && (
          <div style={{ display: 'flex', gap: 10, padding: '0 16px 12px' }}>
            <div style={{ flex: 1 }}>
              <div className="sp-dp-label">ВЕС ({ex.unit})</div>
              <div className="sp-num-picker">
                <div className="sp-np-btn" onClick={() => adjust('weight', -2.5)}>−</div>
                <div className="sp-np-center">
                  <div className="sp-np-val">{weight}</div>
                  <div className="sp-np-unit">{ex.unit}</div>
                </div>
                <div className="sp-np-btn" onClick={() => adjust('weight', 2.5)}>+</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div className="sp-dp-label">ПОВТОРЕНИЯ</div>
              <div className="sp-num-picker">
                <div className="sp-np-btn" onClick={() => adjust('reps', -1)}>−</div>
                <div className="sp-np-center">
                  <div className="sp-np-val">{reps}</div>
                  <div className="sp-np-unit">повт.</div>
                </div>
                <div className="sp-np-btn" onClick={() => adjust('reps', 1)}>+</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Record banner */}
      <div className={`sp-rec-banner ${isNewRec ? 'sp-rec-banner--new-rec' : 'sp-rec-banner--normal'}`}>
        <div className="sp-rb-label">{isNewRec ? '🏆 Новый личный рекорд!' : 'Текущий рекорд'}</div>
        <div className="sp-rb-val">
          {isNewRec
            ? (rec ? `Был: ${rec.val} ${ex.unit}` : 'Первый результат!')
            : (rec ? `${rec.val} ${ex.unit}` : '—')}
        </div>
      </div>

      {/* Sets */}
      <div style={{ padding: '0 16px 12px' }}>
        <div className="sp-dp-label">ПОДХОДЫ (необязательно)</div>
        <div className="sp-num-picker">
          <div className="sp-np-btn" onClick={() => adjust('sets', -1)}>−</div>
          <div className="sp-np-center">
            <div className="sp-np-val">{sets}</div>
            <div className="sp-np-unit">подхода</div>
          </div>
          <div className="sp-np-btn" onClick={() => adjust('sets', 1)}>+</div>
        </div>
      </div>

      {/* Note */}
      <div style={{ padding: '0 16px 12px' }}>
        <div className="sp-dp-label">ЗАМЕТКА (необязательно)</div>
        <input
          type="text"
          className="sp-fi"
          placeholder="Как прошла тренировка..."
          maxLength={100}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      <button
        className={`sp-sh-cta${isNewRec ? ' sp-sh-cta--new-rec' : ''}`}
        onClick={handleSave}
      >
        {isNewRec ? '🏆 Сохранить новый рекорд!' : 'Сохранить результат'}
      </button>
    </div>
  )
}

// ── Detail Sheet ──────────────────────────────────────
function DetailSheet({ ex, categories, onClose, onAddLog, onDelete, onEdit, showToast }) {
  const sheetRef = useRef(null)
  const [showResult, setShowResult] = useState(false)
  const [detailTT, setDetailTT] = useState('reps')

  const handleClose = useCallback(() => onClose(), [onClose])
  useSwipeDown(sheetRef, handleClose)

  if (!ex) return null

  const logs = getLogsArray(ex)
  const rec = getRecord(ex)
  const delta = getDelta(ex)
  const streak = getStreak(ex)
  const color = catColor(ex.catId, categories)
  const chartLogs = ex.type === 'both' && detailTT === 'reps'
    ? logs.map(l => ({ ...l, val: l.val2 || 0 }))
    : logs

  const recDisplay = rec
    ? (ex.type === 'both' ? `${rec.val} ${ex.unit} × ${rec.val2}` : `${rec.val} ${ex.unit}`)
    : '—'

  const handleDelete = () => {
    onDelete(ex.id)
    showToast('Упражнение удалено')
    onClose()
  }

  const handleAddLog = (exId, logEntry) => {
    onAddLog(exId, logEntry)
    showToast(logEntry.isNewRec ? '🏆 Новый личный рекорд!' : '✓ Результат сохранён')
    setShowResult(false)
  }

  const lastDate = logs.length > 0
    ? fmtDate([...logs].sort((a, b) => b.date.localeCompare(a.date))[0].date)
    : 'Нет записей'

  const now = new Date()

  return (
    <>
      <div ref={sheetRef} className="sp-sheet sp-sheet--open sp-sheet--detail">
        <div className="sp-sh-handle" />

        {/* Hero */}
        <div className="sp-detail-hero">
          <div className="sp-dh-top">
            <div>
              <div className="sp-dh-name">{ex.name}</div>
              <div className="sp-dh-cat">{catName(ex.catId, categories)} · {typeLabel(ex.type)}</div>
            </div>
            <div className="sp-dh-record-box">
              <div className="sp-dh-rec-num">{rec ? rec.val : '—'}</div>
              <div className="sp-dh-rec-sub" style={{ color }}>🏆 Рекорд</div>
            </div>
          </div>
          <div className="sp-dh-stats">
            <div className="sp-dhs">
              <div className="sp-dhs-v">🔥 {streak}</div>
              <div className="sp-dhs-k">Серия</div>
            </div>
            <div className="sp-dhs">
              <div className="sp-dhs-v">{logs.length}</div>
              <div className="sp-dhs-k">Сессий</div>
            </div>
            <div className="sp-dhs">
              <div className="sp-dhs-v" style={{ color: delta === null ? 'var(--sp-char)' : delta >= 0 ? 'var(--sp-mint)' : 'var(--sp-coral)' }}>
                {delta === null ? '—' : (delta >= 0 ? `▲ +${Math.abs(delta).toFixed(1)}` : `▼ ${Math.abs(delta).toFixed(1)}`)}
              </div>
              <div className="sp-dhs-k">За месяц</div>
            </div>
          </div>
        </div>

        {/* Type toggle for 'both' */}
        {ex.type === 'both' && (
          <div className="sp-type-toggle">
            {[{ key: 'reps', label: '🔢 Повторения' }, { key: 'weight', label: '⚖️ Вес' }].map(opt => (
              <div
                key={opt.key}
                className={`sp-tt-btn${detailTT === opt.key ? ' sp-tt-btn--active' : ''}`}
                onClick={() => setDetailTT(opt.key)}
              >
                {opt.label}
              </div>
            ))}
          </div>
        )}

        {/* Chart */}
        <div className="sp-detail-sec">
          <div className="sp-dc">
            <div className="sp-dc-head">
              График прогресса
              <span style={{ color: 'var(--sp-muted)', fontWeight: 400 }}>
                {MONTH_NAMES[now.getMonth()].slice(0, 3)} {now.getFullYear()}
              </span>
            </div>
            <Chart logs={chartLogs} color={color} />
          </div>
        </div>

        {/* Log */}
        <div className="sp-detail-sec">
          <div className="sp-dc">
            <div className="sp-dc-head">
              История
              <span style={{ color: 'var(--sp-muted)', fontWeight: 400 }}>{logs.length} записей</span>
            </div>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', fontSize: 12, color: 'var(--sp-muted)' }}>
                Нет записей. Внесите первый результат!
              </div>
            ) : (
              [...logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map((l, idx) => {
                const isPR = rec && l.val === rec.val && l.date === rec.date
                const mainVal = ex.type === 'both' ? `${l.val} ${ex.unit} × ${l.val2}` : `${l.val} ${ex.unit}`
                return (
                  <div key={idx} className="sp-log-item">
                    <div>
                      <div className="sp-log-date">{fmtDow(l.date)}, {fmtDate(l.date)}</div>
                      {l.note ? <div className="sp-log-note">{l.note}</div> : null}
                    </div>
                    <div className="sp-log-right">
                      <div className="sp-log-main">
                        {mainVal}
                        {isPR && <span className="sp-log-badge sp-lb-pr">🏆 PR</span>}
                      </div>
                      {l.sets ? <div className="sp-log-sub">{l.sets} подхода</div> : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Add result CTA */}
        <div style={{ padding: '4px 12px 8px' }}>
          <button className="sp-sh-cta" style={{ margin: 0, width: '100%' }} onClick={() => setShowResult(true)}>
            + Внести результат сегодня
          </button>
        </div>

        <div className="sp-detail-actions">
          <button className="sp-dact-btn sp-dact-btn--secondary" onClick={() => { onClose(); onEdit(ex) }}>
            Изменить
          </button>
          <button className="sp-dact-btn sp-dact-btn--danger" onClick={handleDelete}>
            Удалить упражнение
          </button>
        </div>
      </div>

      {showResult && (
        <AddResultSheet
          ex={ex}
          onSave={(exId, entry) => {
            const rec = getRecord(ex)
            const isNewRec = rec ? (ex.type === 'time' ? entry.val < rec.val : entry.val > rec.val) : true
            handleAddLog(exId, { ...entry, isNewRec })
          }}
          onClose={() => setShowResult(false)}
        />
      )}
    </>
  )
}

// ── Exercise Card ─────────────────────────────────────
function ExCard({ ex, index, categories, onClick }) {
  const logs = getLogsArray(ex)
  const rec = getRecord(ex)
  const delta = getDelta(ex)
  const color = catColor(ex.catId, categories)
  const recUnit = ex.type === 'both' ? `× ${rec?.val2 || '—'} повт.` : ex.unit
  const lastDate = logs.length > 0
    ? fmtDate([...logs].sort((a, b) => b.date.localeCompare(a.date))[0].date)
    : 'Нет записей'

  return (
    <div className="sp-ex-card" onClick={onClick}>
      <div className="sp-ex-color-bar" style={{ background: color }} />
      <div className="sp-ex-inner">
        <div className="sp-ex-info">
          <div className="sp-ex-name">{ex.name}</div>
          <div className="sp-ex-meta">{typeLabel(ex.type)} · {lastDate}</div>
          <Sparkline logs={logs} color={color} />
        </div>
        <div className="sp-ex-right">
          <div className="sp-ex-record">{rec ? rec.val : '—'}</div>
          <div className="sp-ex-record-sub">{recUnit}</div>
          {delta !== null && (
            <div className={`sp-ex-delta ${delta > 0 ? 'sp-delta-up' : delta < 0 ? 'sp-delta-dn' : 'sp-delta-eq'}`}>
              {delta > 0 ? `▲ +${Math.abs(delta).toFixed(1)} ${ex.unit}` :
               delta < 0 ? `▼ −${Math.abs(delta).toFixed(1)} ${ex.unit}` : '— без изм.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main SportsBoard ──────────────────────────────────
export default function SportsBoard({ categories, exercises, onAddCat, onDeleteCat, onUpdateCat, onAddEx, onUpdateEx, onDeleteEx, onAddLog }) {
  const [activeCat, setActiveCat] = useState('all')
  const [searchQ, setSearchQ] = useState('')
  const [showAddCat, setShowAddCat] = useState(false)
  const [editingCat, setEditingCat] = useState(null)
  const [showAddEx, setShowAddEx] = useState(false)
  const [preCatId, setPreCatId] = useState(null)
  const [editEx, setEditEx] = useState(null)
  const [detailEx, setDetailEx] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const toastTimer = useRef(null)

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setToastShow(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 2200)
  }, [])

  const anySheetOpen = showAddCat || showAddEx || !!detailEx

  // Filter exercises
  const filtered = exercises.filter(ex => {
    const matchCat = activeCat === 'all' || ex.catId === activeCat
    const matchSearch = !searchQ || ex.name.toLowerCase().includes(searchQ.toLowerCase())
    return matchCat && matchSearch
  })

  // Group by category
  const groups = {}
  filtered.forEach(ex => {
    if (!groups[ex.catId]) groups[ex.catId] = []
    groups[ex.catId].push(ex)
  })

  const totalSessions = exercises.reduce((s, ex) => s + Object.values(ex.logs || {}).length, 0)

  const handleOpenAddEx = (preCat = null) => {
    if (categories.length === 0) { showToast('Сначала создайте категорию'); return }
    setPreCatId(preCat)
    setEditEx(null)
    setShowAddEx(true)
  }

  const handleEdit = (ex) => {
    setEditEx(ex)
    setPreCatId(null)
    setShowAddEx(true)
  }

  const closeAll = () => {
    setShowAddCat(false)
    setShowAddEx(false)
    setDetailEx(null)
    setEditEx(null)
  }

  return (
    <div className="sports-root">
      {/* Header */}
      <div className="sp-header">
        <div className="sp-header-row">
          <div>
            <div className="sp-header-title">Спорт</div>
            <div className="sp-header-sub">
              {exercises.length} упражнений · {totalSessions} записей
            </div>
          </div>
          <div className="sp-header-actions">
            <button className="sp-btn-sm sp-btn-sm--secondary" onClick={() => setShowAddCat(true)}>
              + Категория
            </button>
            <button className="sp-btn-sm sp-btn-sm--primary" onClick={() => handleOpenAddEx(null)}>
              + Упражнение
            </button>
          </div>
        </div>
        <div className="sp-stats-row">
          <div className="sp-stat-box">
            <div className="sp-stat-v">{categories.length}</div>
            <div className="sp-stat-k">Категории</div>
          </div>
          <div className="sp-stat-box">
            <div className="sp-stat-v">{exercises.length}</div>
            <div className="sp-stat-k">Упражнений</div>
          </div>
          <div className="sp-stat-box">
            <div className="sp-stat-v" style={{ color: 'var(--sp-mint)' }}>
              {exercises.filter(ex => getLogsArray(ex).length > 0).length}
            </div>
            <div className="sp-stat-k">Рекордов</div>
          </div>
          <div className="sp-stat-box">
            <div className="sp-stat-v">{totalSessions}</div>
            <div className="sp-stat-k">Сессий</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="sp-search-bar">
        <input
          type="text"
          className="sp-search-input"
          placeholder="🔍  Поиск упражнения..."
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="sp-cat-tabs">
        <div
          className={`sp-cat-tab${activeCat === 'all' ? ' sp-cat-tab--active' : ''}`}
          onClick={() => setActiveCat('all')}
        >
          Все
        </div>
        {categories.map(c => (
          <div
            key={c.id}
            className={`sp-cat-tab${activeCat === c.id ? ' sp-cat-tab--active' : ''}`}
            onClick={() => setActiveCat(c.id)}
          >
            {c.emoji} {c.name}
          </div>
        ))}
      </div>

      {/* Exercise list */}
      <div className="sp-scroll">
        {exercises.length === 0 ? (
          <div className="sp-empty-state">
            <div className="sp-e-icon">🏆</div>
            <div className="sp-e-title">Нет упражнений</div>
            <div className="sp-e-sub">Создайте категорию и добавьте первое упражнение для отслеживания прогресса.</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="sp-empty-state">
            <div className="sp-e-icon">🔍</div>
            <div className="sp-e-title">Ничего не найдено</div>
            <div className="sp-e-sub">Попробуйте изменить поиск или выбрать другую категорию.</div>
          </div>
        ) : (
          Object.entries(groups).map(([catId, exs]) => {
            const cat = categories.find(c => c.id === catId)
            return (
              <div key={catId} className="sp-cat-section">
                <div className="sp-cat-label">
                  {cat ? `${cat.emoji} ${cat.name}` : 'Без категории'}
                  <span
                    className="sp-cat-label-add"
                    onClick={() => handleOpenAddEx(catId)}
                  >
                    + добавить упражнение
                  </span>
                  {cat && (
                    <span
                      className="sp-cat-label-edit"
                      onClick={() => { setEditingCat(cat); setShowAddCat(true) }}
                    >
                      редактировать
                    </span>
                  )}
                </div>
                {exs.map((ex, i) => (
                  <ExCard
                    key={ex.id}
                    ex={ex}
                    index={i}
                    categories={categories}
                    onClick={() => setDetailEx(ex)}
                  />
                ))}
              </div>
            )
          })
        )}
        <div className="sp-add-cat-tile" onClick={() => setShowAddCat(true)}>
          + Добавить категорию
        </div>
      </div>

      {/* Backdrop */}
      <div
        className={`sp-backdrop${anySheetOpen ? ' sp-backdrop--visible' : ''}`}
        onClick={closeAll}
      />

      {/* Add category sheet */}
      {showAddCat && (
        <AddCatSheet
          onSave={(cat) => { onAddCat(cat); showToast('✓ Категория создана'); }}
          onUpdate={(id, changes) => { onUpdateCat(id, changes); showToast('✓ Категория обновлена'); }}
          onClose={() => { setShowAddCat(false); setEditingCat(null) }}
          categoriesCount={categories.length}
          editingCat={editingCat}
        />
      )}

      {/* Add exercise sheet */}
      {showAddEx && (
        <AddExSheet
          onSave={(idOrObj, changes) => {
            if (changes) {
              onUpdateEx(idOrObj, changes)
              showToast('✓ Упражнение обновлено')
            } else {
              onAddEx(idOrObj)
              showToast('✓ Упражнение добавлено')
            }
          }}
          onClose={() => { setShowAddEx(false); setEditEx(null) }}
          categories={categories}
          editEx={editEx}
          preCatId={preCatId}
        />
      )}

      {/* Detail sheet */}
      {detailEx && (
        <DetailSheet
          ex={detailEx}
          categories={categories}
          onClose={() => setDetailEx(null)}
          onAddLog={(exId, entry) => {
            onAddLog(exId, entry)
            showToast(entry.isNewRec ? '🏆 Новый личный рекорд!' : '✓ Результат сохранён')
            // Update local detailEx to re-render
            setDetailEx(prev => prev ? { ...prev } : null)
          }}
          onDelete={(id) => { onDeleteEx(id); setDetailEx(null); showToast('Упражнение удалено') }}
          onEdit={(ex) => { setDetailEx(null); handleEdit(ex) }}
          showToast={showToast}
        />
      )}

      {/* Toast */}
      <div className={`sp-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  )
}
