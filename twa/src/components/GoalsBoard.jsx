import { useState, useRef, useEffect, useCallback } from 'react'

// ── Сжатие фото до base64 ─────────────────────────────────────────────────────
function compressImage(file, maxPx = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const scale = Math.min(maxPx / img.width, maxPx / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  })
}

// ── Helpers ───────────────────────────────────────────

const EMOJIS = ['✨','🏠','✈️','🚗','💼','💪','📚','🧘','💰','🌴','🎯','❤️','🏋️','🎓','🌍','💎']

const GRAD_COLORS = [
  ['#D4A8A0','#C4887E'],
  ['#A0B8D4','#7EA0C4'],
  ['#A0D4B8','#7EC4A0'],
  ['#C4A0D4','#B080C4'],
  ['#D4CCA0','#C4BC80'],
  ['#D4B4A0','#C49480'],
]

const HEIGHT_PATTERNS = [
  ['h-tall','h-short'],
  ['h-short','h-tall'],
  ['h-med','h-med'],
  ['h-tall','h-short'],
  ['h-short','h-med'],
]

function tileHeightClass(index) {
  const pi = Math.floor(index / 2) % HEIGHT_PATTERNS.length
  return HEIGHT_PATTERNS[pi][index % 2]
}

function gradForIndex(i) {
  const [a, b] = GRAD_COLORS[i % GRAD_COLORS.length]
  return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`
}

function formatDeadlineYear(deadline) {
  if (!deadline) return null
  return deadline.slice(0, 4)
}

function formatDeadlineFull(deadline) {
  if (!deadline) return null
  const [y, m, d] = deadline.split('-')
  return `${d}.${m}.${y}`
}

// ── Swipe-down hook for sheets ─────────────────────────

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

// ── GoalTile ──────────────────────────────────────────

function GoalTile({ goal, index, view, onClick }) {
  const heightClass = view === 'board' ? tileHeightClass(index) : 'h-list'
  const hasPhoto = !!goal.imageBase64
  const yearBadge = formatDeadlineYear(goal.deadline)

  return (
    <div
      className={`gn-tile${goal.completed ? ' gn-tile--achieved' : ''}`}
      onClick={onClick}
    >
      <div className={`gn-tile-photo ${heightClass}`}>
        {hasPhoto ? (
          <img src={goal.imageBase64} alt={goal.title} loading="lazy" />
        ) : (
          <div className="gn-tile-placeholder" style={{ background: gradForIndex(index) }}>
            <div className="ph-emoji">{goal.emoji || '🎯'}</div>
            <div className="ph-text">{goal.title}</div>
          </div>
        )}
        <div className="gn-tile-overlay">
          <div className="gn-tile-label">{goal.title}</div>
        </div>
        {yearBadge && <div className="gn-tile-year-badge">{yearBadge}</div>}
        {goal.completed && <div className="gn-tile-achieved-badge">✓ Достигнуто</div>}
      </div>

      {view === 'list' && (
        <div className="gn-tile-info">
          <div className="gn-tile-info-name">{goal.title}</div>
          <div className="gn-tile-info-meta">
            <span className="gn-tile-info-tag">
              {goal.emoji} {goal.deadline ? formatDeadlineFull(goal.deadline) : 'Мечта'}
            </span>
            <span style={{ fontSize: '11px', color: goal.completed ? 'var(--gn-mint)' : 'var(--gn-lav)' }}>
              {goal.completed ? '✓ Достигнуто' : `${goal.progress ?? 0}%`}
            </span>
          </div>
          <div className="gn-tile-info-status-bar">
            <div className="gn-tile-info-status-track">
              <div
                className="gn-tile-info-status-fill"
                style={{ width: `${goal.completed ? 100 : (goal.progress ?? 0)}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Detail Sheet ──────────────────────────────────────

function DetailSheet({ goal, onClose, onUpdate, onDelete, showToast, onEdit }) {
  const sheetRef = useRef(null)
  const [editingDesc, setEditingDesc] = useState(false)
  const [description, setDescription] = useState(goal?.description || '')

  useEffect(() => {
    setDescription(goal?.description || '')
    setEditingDesc(false)
  }, [goal])

  const handleClose = useCallback(() => onClose(), [onClose])
  useSwipeDown(sheetRef, handleClose)

  if (!goal) return null

  const handleAchieve = () => {
    const newCompleted = !goal.completed
    onUpdate(goal.id, { completed: newCompleted })
    showToast(newCompleted ? '🏆 Цель достигнута!' : '↩ Возвращено в работу')
    onClose()
  }

  const handleDelete = () => {
    onDelete(goal.id)
    showToast('Цель удалена')
    onClose()
  }

  const handleSaveDesc = () => {
    onUpdate(goal.id, { description: description.trim() })
    setEditingDesc(false)
  }

  const yearBadge = formatDeadlineYear(goal.deadline)

  return (
    <div
      ref={sheetRef}
      className={`gn-detail-sheet gn-detail-sheet--open`}
    >
      <div className="gn-sheet-handle" />
      <div className="gn-sheet-photo-wrap">
        {goal.imageBase64 ? (
          <img src={goal.imageBase64} alt={goal.title} />
        ) : (
          <div className="gn-sheet-photo-placeholder">
            <span>{goal.emoji || '✨'}</span>
            <p>Нет фото</p>
          </div>
        )}
      </div>
      <div className="gn-sheet-body">
        <div className="gn-sheet-name">{goal.title}</div>
        <div className="gn-sheet-meta">
          {yearBadge && (
            <span className="gn-sheet-badge gn-sheet-badge--year">
              {goal.emoji} {goal.deadline ? formatDeadlineFull(goal.deadline) : 'Мечта'}
            </span>
          )}
          <span className={`gn-sheet-badge ${goal.completed ? 'gn-sheet-badge--achieved' : 'gn-sheet-badge--active'}`}>
            {goal.completed ? '✓ Достигнуто' : 'В процессе'}
          </span>
        </div>

        {editingDesc ? (
          <>
            <textarea
              className="gn-sheet-desc-textarea"
              value={description}
              rows={4}
              autoFocus
              onChange={e => setDescription(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                className="gn-sheet-btn gn-sheet-btn--secondary"
                style={{ flex: 1 }}
                onClick={() => { setDescription(goal.description || ''); setEditingDesc(false) }}
              >
                Отмена
              </button>
              <button
                className="gn-sheet-btn gn-sheet-btn--primary"
                style={{ flex: 1 }}
                onClick={handleSaveDesc}
              >
                Сохранить
              </button>
            </div>
          </>
        ) : (
          <div className="gn-sheet-desc" onClick={() => setEditingDesc(true)}>
            {description
              ? description
              : <span className="gn-sheet-desc-placeholder">Нажмите, чтобы добавить описание...</span>
            }
          </div>
        )}

        {(() => {
          const pct = goal.completed ? 100 : (goal.progress ?? 0)
          return (
            <>
              <div className="gn-sheet-progress-label">
                <span>Прогресс</span>
                <span>{pct}%</span>
              </div>
              <div className="gn-sheet-progress-track">
                <div className="gn-sheet-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </>
          )
        })()}

        <div className="gn-sheet-actions">
          <button
            className={`gn-sheet-btn ${goal.completed ? 'gn-sheet-btn--done' : 'gn-sheet-btn--primary'}`}
            onClick={handleAchieve}
          >
            {goal.completed ? '↩ Вернуть в работу' : '🏆 Достигнуто!'}
          </button>
          <button
            className="gn-sheet-btn gn-sheet-btn--secondary"
            style={{ flex: '0 0 90px' }}
            onClick={() => { onClose(); onEdit(goal) }}
          >
            Изменить
          </button>
          <button
            className="gn-sheet-btn gn-sheet-btn--danger"
            style={{ flex: '0 0 52px' }}
            onClick={handleDelete}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add Sheet ─────────────────────────────────────────

function AddSheet({ onSave, onClose, nextOrder, showToast, editGoal }) {
  const sheetRef = useRef(null)

  const currentYear = new Date().getFullYear()
  const YEAR_CHIPS = [String(currentYear), String(currentYear + 1), String(currentYear + 2), 'Мечта']

  function deadlineToYearChip(deadline) {
    if (!deadline) return 'Мечта'
    const year = deadline.slice(0, 4)
    return YEAR_CHIPS.includes(year) ? year : 'Мечта'
  }

  function yearChipToDeadline(chip) {
    return chip === 'Мечта' ? null : `${chip}-12-31`
  }

  const [title, setTitle] = useState(editGoal?.title || '')
  const [emoji, setEmoji] = useState(editGoal?.emoji || '✨')
  const [description, setDescription] = useState(editGoal?.description || '')
  const [imageBase64, setImageBase64] = useState(editGoal?.imageBase64 || null)
  const [imageLoading, setImageLoading] = useState(false)
  const [selectedYear, setSelectedYear] = useState(editGoal ? deadlineToYearChip(editGoal.deadline) : String(currentYear))
  const [progress, setProgress] = useState(editGoal?.progress ?? 0)

  const handleClose = useCallback(() => onClose(), [onClose])
  useSwipeDown(sheetRef, handleClose)

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      showToast('Файл слишком большой (макс. 10 МБ)')
      return
    }
    setImageLoading(true)
    const b64 = await compressImage(file)
    setImageBase64(b64)
    setImageLoading(false)
  }

  const handleSave = () => {
    if (!title.trim()) return
    const deadlineValue = yearChipToDeadline(selectedYear)
    const isCompleted = progress === 100

    if (editGoal) {
      onSave(editGoal.id, {
        title: title.trim(),
        emoji,
        description: description.trim(),
        deadline: deadlineValue,
        imageBase64: imageBase64 || null,
        completed: isCompleted,
        progress,
      })
      showToast('✓ Цель обновлена')
    } else {
      onSave({
        id: Date.now().toString(),
        title: title.trim(),
        emoji,
        description: description.trim(),
        deadline: deadlineValue,
        imageBase64: imageBase64 || null,
        completed: isCompleted,
        progress,
        order: nextOrder,
        size: 'small',
        createdAt: new Date().toISOString().slice(0, 10),
      })
      showToast('✨ Цель добавлена!')
    }
    onClose()
  }

  return (
    <div ref={sheetRef} className="gn-add-sheet gn-add-sheet--open">
      <div className="gn-add-header">
        <div className="gn-add-title">{editGoal ? 'Изменить цель' : 'Новая цель'}</div>
        <div className="gn-add-close" onClick={onClose}>✕</div>
      </div>

      <div className="gn-add-form">
        {/* Photo */}
        <div className="gn-form-group">
          <div className="gn-form-label">ФОТО ЦЕЛИ</div>
          <label
            className={`gn-photo-upload${imageBase64 ? ' gn-photo-upload--has-photo' : ''}`}
          >
            {imageBase64 ? (
              <>
                <img src={imageBase64} className="gn-photo-upload__img" alt="preview" />
                <div className="gn-pu-change">Изменить фото</div>
              </>
            ) : (
              <div className="gn-photo-upload__placeholder">
                <div className="gn-pu-icon">🖼</div>
                <div className="gn-pu-text">
                  {imageLoading ? 'Загрузка...' : 'Нажмите чтобы выбрать фото'}
                </div>
                <div className="gn-pu-sub">JPEG, PNG — до 10 МБ</div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImage}
            />
          </label>
        </div>

        {/* Name */}
        <div className="gn-form-group">
          <div className="gn-form-label">НАЗВАНИЕ ЦЕЛИ</div>
          <input
            type="text"
            className="gn-form-input"
            placeholder="Например: Дом у моря"
            maxLength={60}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Description */}
        <div className="gn-form-group">
          <div className="gn-form-label">ОПИСАНИЕ (необязательно)</div>
          <textarea
            className="gn-form-textarea"
            placeholder="Почему эта цель важна для тебя..."
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Emoji */}
        <div className="gn-form-group">
          <div className="gn-form-label">ИКОНКА</div>
          <div className="gn-emoji-grid">
            {EMOJIS.map(e => (
              <div
                key={e}
                className={`gn-emoji-chip${emoji === e ? ' gn-emoji-chip--sel' : ''}`}
                onClick={() => setEmoji(e)}
              >
                {e}
              </div>
            ))}
          </div>
        </div>

        {/* Year chips */}
        <div className="gn-form-group">
          <div className="gn-form-label">СРОК</div>
          <div className="gn-year-chips">
            {YEAR_CHIPS.map(chip => (
              <div
                key={chip}
                className={`gn-year-chip${selectedYear === chip ? ' gn-year-chip--sel' : ''}`}
                onClick={() => setSelectedYear(chip)}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        {/* Progress slider */}
        <div className="gn-form-group">
          <div className="gn-form-label">НАЧАЛЬНЫЙ ПРОГРЕСС</div>
          <input
            type="range"
            className="gn-progress-slider"
            min="0"
            max="100"
            value={progress}
            onChange={e => setProgress(Number(e.target.value))}
          />
          <div className="gn-progress-label-row">{progress}%</div>
        </div>
      </div>

      <button
        className="gn-add-cta"
        disabled={!title.trim()}
        onClick={handleSave}
      >
        {editGoal ? '✓ Сохранить изменения' : '✨ Добавить цель'}
      </button>
    </div>
  )
}

// ── Main GoalsBoard ───────────────────────────────────

export default function GoalsBoard({ goals, onAdd, onUpdate, onDelete, onReorder }) {
  const [view, setView] = useState('board')
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editGoal, setEditGoal] = useState(null)
  const [toastMsg, setToastMsg] = useState('')
  const [toastShow, setToastShow] = useState(false)
  const toastTimer = useRef(null)
  const backdropRef = useRef(null)

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setToastShow(true)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShow(false), 2200)
  }, [])

  const total = goals.length
  const achieved = goals.filter(g => g.completed).length
  const currentYear = String(new Date().getFullYear())
  const thisYear = goals.filter(g => g.deadline && g.deadline.startsWith(currentYear)).length

  const closeAll = useCallback(() => {
    setSelectedGoal(null)
    setShowAddForm(false)
    setEditGoal(null)
  }, [])

  const handleEdit = useCallback((goal) => {
    setEditGoal(goal)
    setShowAddForm(true)
    setSelectedGoal(null)
  }, [])

  const anySheetOpen = !!selectedGoal || showAddForm

  return (
    <div className="goals-new-root">
      {/* Header */}
      <div className="gn-header">
        <div className="gn-header-left">
          <div className="gn-header-title">Карта желаний</div>
          <div className="gn-header-sub">
            {total} {total === 1 ? 'цель' : total >= 2 && total <= 4 ? 'цели' : 'целей'} · {achieved} достигнуто
          </div>
        </div>
        <div className="gn-header-right">
          <div
            className="gn-btn-icon"
            onClick={() => showToast('✏️ Режим редактирования — скоро')}
          >
            ✏️
          </div>
          <button
            className="gn-btn-add"
            onClick={() => { setEditGoal(null); setShowAddForm(true) }}
          >
            + Цель
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="gn-stats-strip">
        <div className="gn-stat-pill">
          <div className="gn-stat-val">{total}</div>
          <div className="gn-stat-key">Целей</div>
        </div>
        <div className="gn-stat-pill">
          <div className="gn-stat-val gn-stat-val--mint">{achieved}</div>
          <div className="gn-stat-key">Достигнуто</div>
        </div>
        <div className="gn-stat-pill">
          <div className="gn-stat-val">{thisYear}</div>
          <div className="gn-stat-key">В этом году</div>
        </div>
        <div className="gn-stat-pill">
          <div className="gn-stat-val gn-stat-val--lav">
            {total > 0 ? Math.round((achieved / total) * 100) : 0}%
          </div>
          <div className="gn-stat-key">Прогресс</div>
        </div>
      </div>

      {/* View toggle */}
      <div className="gn-view-toggle">
        <button
          className={`gn-vt-btn${view === 'board' ? ' gn-vt-btn--active' : ''}`}
          onClick={() => setView('board')}
        >
          ⊞ Доска
        </button>
        <button
          className={`gn-vt-btn${view === 'list' ? ' gn-vt-btn--active' : ''}`}
          onClick={() => setView('list')}
        >
          ☰ Список
        </button>
      </div>

      {/* Board / List */}
      <div className="gn-board-wrap">
        {goals.length === 0 ? (
          <div className="gn-empty-board">
            <div className="gn-empty-icon">✨</div>
            <div className="gn-empty-title">Карта желаний пуста</div>
            <div className="gn-empty-sub">
              Добавьте первую цель — фото, название и срок. Визуализация мечты работает!
            </div>
            <button className="gn-empty-btn" onClick={() => { setEditGoal(null); setShowAddForm(true) }}>
              + Добавить первую цель
            </button>
          </div>
        ) : view === 'board' ? (
          <div className="gn-masonry">
            {goals.map((goal, i) => (
              <GoalTile
                key={goal.id}
                goal={goal}
                index={i}
                view="board"
                onClick={() => setSelectedGoal(goal)}
              />
            ))}
          </div>
        ) : (
          <div className="gn-list-view">
            {goals.map((goal, i) => (
              <GoalTile
                key={goal.id}
                goal={goal}
                index={i}
                view="list"
                onClick={() => setSelectedGoal(goal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Backdrop */}
      <div
        className={`gn-backdrop${anySheetOpen ? ' gn-backdrop--visible' : ''}`}
        onClick={closeAll}
      />

      {/* Detail sheet */}
      {selectedGoal && (
        <DetailSheet
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={(id, changes) => {
            onUpdate(id, changes)
            setSelectedGoal(prev => prev ? { ...prev, ...changes } : null)
          }}
          onDelete={onDelete}
          showToast={showToast}
          onEdit={handleEdit}
        />
      )}

      {/* Add sheet */}
      {showAddForm && (
        <AddSheet
          onSave={editGoal
            ? (id, changes) => onUpdate(id, changes)
            : onAdd
          }
          onClose={() => { setShowAddForm(false); setEditGoal(null) }}
          nextOrder={goals.length}
          showToast={showToast}
          editGoal={editGoal}
        />
      )}

      {/* Toast */}
      <div className={`gn-toast${toastShow ? ' show' : ''}`}>{toastMsg}</div>
    </div>
  )
}
