import { useState } from 'react'

// ── Сжатие фото до base64 ─────────────────────────────────────────────────────
function compressImage(file, maxPx = 400, quality = 0.75) {
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

// ── Форма добавления цели ─────────────────────────────────────────────────────
function GoalAddForm({ onSave, onClose, nextOrder }) {
  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [imageBase64, setImageBase64] = useState(null)
  const [imageLoading, setImageLoading] = useState(false)

  const handleImage = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageLoading(true)
    const b64 = await compressImage(file)
    setImageBase64(b64)
    setImageLoading(false)
  }

  const handleSave = () => {
    if (!title.trim()) return
    const id = Date.now().toString()
    onSave({
      id,
      title: title.trim(),
      emoji: emoji.trim(),
      description: description.trim(),
      deadline: deadline || null,
      imageBase64: imageBase64 || null,
      completed: false,
      order: nextOrder,
      size: 'small',
      createdAt: new Date().toISOString().slice(0, 10),
    })
    onClose()
  }

  return (
    <div className="goal-modal-overlay" onClick={onClose}>
      <div className="goal-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="goal-modal-handle" />
        <h3 className="goal-modal-title">Новая цель</h3>

        <div className="goal-form-row">
          <input
            className="goal-form-input goal-form-emoji"
            placeholder="😊"
            value={emoji}
            maxLength={2}
            onChange={(e) => setEmoji(e.target.value)}
          />
          <input
            className="goal-form-input goal-form-name"
            placeholder="Название цели"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <textarea
          className="goal-form-textarea"
          placeholder="Описание / заметка"
          value={description}
          rows={3}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="goal-form-row">
          <label className="goal-form-label">Дедлайн:</label>
          <input
            type="date"
            className="goal-form-input goal-form-date"
            max="9999-12-31"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <label className="goal-photo-label">
          {imageLoading ? 'Загрузка...' : imageBase64 ? '✓ Фото загружено' : '📷 Добавить фото'}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImage}
          />
        </label>
        {imageBase64 && (
          <img src={imageBase64} className="goal-form-preview" alt="preview" />
        )}

        <div className="goal-form-actions">
          <button className="goal-btn goal-btn--secondary" onClick={onClose}>Отмена</button>
          <button className="goal-btn goal-btn--primary" onClick={handleSave} disabled={!title.trim()}>
            Добавить
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Модал деталей цели ────────────────────────────────────────────────────────
function GoalDetailModal({ goal, onClose, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState(goal.description || '')

  const handleComplete = () => {
    onUpdate(goal.id, { completed: !goal.completed })
    onClose()
  }

  const handleSaveDesc = () => {
    onUpdate(goal.id, { description })
    setEditing(false)
  }

  const formatDeadline = (d) => {
    if (!d) return null
    const [year, month, day] = d.split('-')
    return `${day}.${month}.${year}`
  }

  return (
    <div className="goal-modal-overlay" onClick={onClose}>
      <div className="goal-modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="goal-modal-handle" />

        {goal.imageBase64 && (
          <img src={goal.imageBase64} className="goal-detail-image" alt={goal.title} />
        )}

        <div className="goal-detail-header">
          {goal.emoji && <span className="goal-detail-emoji">{goal.emoji}</span>}
          <h3 className="goal-detail-title">{goal.title}</h3>
        </div>

        {goal.deadline && (
          <p className="goal-detail-deadline">📅 {formatDeadline(goal.deadline)}</p>
        )}

        {editing ? (
          <div>
            <textarea
              className="goal-form-textarea"
              value={description}
              rows={4}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="goal-form-actions">
              <button className="goal-btn goal-btn--secondary" onClick={() => setEditing(false)}>Отмена</button>
              <button className="goal-btn goal-btn--primary" onClick={handleSaveDesc}>Сохранить</button>
            </div>
          </div>
        ) : (
          <p
            className="goal-detail-description"
            onClick={() => setEditing(true)}
          >
            {description || <span className="goal-detail-placeholder">Нажмите, чтобы добавить описание...</span>}
          </p>
        )}

        <button
          className={`goal-btn goal-btn--complete ${goal.completed ? 'goal-btn--completed' : ''}`}
          onClick={handleComplete}
        >
          {goal.completed ? '✓ Выполнено' : 'Отметить выполненной'}
        </button>
      </div>
    </div>
  )
}

// ── Ячейка цели ───────────────────────────────────────────────────────────────
function GoalCell({ goal, editMode, onTap, onDelete, onResize, onDragStart, onDragOver, onDrop }) {
  return (
    <div
      className={`goal-cell ${goal.size === 'large' ? 'goal-cell--large' : ''} ${goal.completed ? 'goal-cell--completed' : ''}`}
      draggable={editMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onTap}
    >
      {goal.imageBase64
        ? <img src={goal.imageBase64} className="goal-cell-img" alt={goal.title} />
        : <div className="goal-cell-placeholder">{goal.emoji || '🎯'}</div>
      }
      <div className="goal-cell-label">
        {goal.emoji && !goal.imageBase64 && null}
        <span>{goal.title}</span>
      </div>
      {goal.completed && <div className="goal-cell-done-badge">✓</div>}

      {editMode && (
        <div className="goal-cell-edit-controls" onClick={(e) => e.stopPropagation()}>
          <button className="goal-cell-btn goal-cell-btn--resize" onClick={onResize} title="Размер">
            {goal.size === 'large' ? '⊟' : '⊞'}
          </button>
          <button className="goal-cell-btn goal-cell-btn--delete" onClick={onDelete} title="Удалить">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

// ── Основной компонент Vision Board ──────────────────────────────────────────
export default function GoalsBoard({ goals, onAdd, onUpdate, onDelete, onReorder }) {
  const [editMode, setEditMode] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [dragId, setDragId] = useState(null)

  const completedCount = goals.filter((g) => g.completed).length
  const progressPct = goals.length ? (completedCount / goals.length) * 100 : 0

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return
    const fromIdx = goals.findIndex((g) => g.id === dragId)
    const toIdx = goals.findIndex((g) => g.id === targetId)
    if (fromIdx === -1 || toIdx === -1) return
    const reordered = [...goals]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)
    onReorder(reordered.map((g, i) => ({ id: g.id, order: i })))
    setDragId(null)
  }

  return (
    <div className="goals-wrapper">
      {/* Шапка */}
      <div className="goals-header">
        <span className="goals-title">Vision Board</span>
        <button
          className={`goals-edit-btn ${editMode ? 'goals-edit-btn--active' : ''}`}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Готово' : 'Ред.'}
        </button>
      </div>

      {/* Сетка */}
      <div className="goals-scroll">
        <div className="goals-grid">
          {goals.map((goal) => (
            <GoalCell
              key={goal.id}
              goal={goal}
              editMode={editMode}
              onTap={() => { if (!editMode) setSelectedGoal(goal) }}
              onDelete={() => onDelete(goal.id)}
              onResize={() => onUpdate(goal.id, { size: goal.size === 'large' ? 'small' : 'large' })}
              onDragStart={() => setDragId(goal.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(goal.id)}
            />
          ))}
          {/* Ячейка добавления */}
          <div className="goal-cell goal-cell--add" onClick={() => !editMode && setShowAddForm(true)}>
            <span className="goal-cell-add-icon">+</span>
          </div>
        </div>
      </div>

      {/* Футер с прогрессом */}
      <div className="goals-footer">
        <span className="goals-footer-text">Целей: {goals.length}</span>
        <div className="goals-progress-track">
          <div className="goals-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="goals-footer-text">Выполнено: {completedCount}</span>
      </div>

      {/* Подсказка */}
      {goals.length === 0 && !editMode && (
        <p className="goals-hint">Нажмите «+» чтобы добавить первую цель</p>
      )}

      {/* Модал деталей */}
      {selectedGoal && (
        <GoalDetailModal
          goal={selectedGoal}
          onClose={() => setSelectedGoal(null)}
          onUpdate={(id, changes) => {
            onUpdate(id, changes)
            setSelectedGoal((prev) => ({ ...prev, ...changes }))
          }}
        />
      )}

      {/* Форма добавления */}
      {showAddForm && (
        <GoalAddForm
          onSave={onAdd}
          onClose={() => setShowAddForm(false)}
          nextOrder={goals.length}
        />
      )}
    </div>
  )
}
