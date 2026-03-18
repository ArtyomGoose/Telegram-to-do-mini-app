import { useState, useEffect, useRef, useCallback } from 'react'

// ── Helpers ──────────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function isTaskOverdue(task) {
  if (!task.deadline) return false
  return new Date(task.deadline).getTime() < Date.now()
}

function getDeadlineColor(task) {
  if (!task.deadline) return undefined
  const created = new Date(task.createdAt).getTime()
  const deadline = new Date(task.deadline).getTime()
  const now = Date.now()
  if (deadline <= created) return 'rgba(224,122,95,0.15)'
  const ratio = (now - created) / (deadline - created)
  if (ratio >= 0.8) return 'rgba(224,122,95,0.15)'
  if (ratio >= 0.5) return 'rgba(244,162,60,0.15)'
  return 'rgba(107,197,151,0.15)'
}

function formatDeadlineBadge(deadline) {
  if (!deadline) return ''
  const dateStr = deadline.split('T')[0]
  const [, m, d] = dateStr.split('-')
  const months = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  let result = `${parseInt(d)} ${months[parseInt(m) - 1]}`
  if (deadline.includes('T')) {
    result += ` ${deadline.split('T')[1]}`
  }
  return result
}

function getGroupLabel(dateStr) {
  const todayStr = getTodayStr()
  const yesterdayStr = getYesterdayStr()
  if (dateStr === todayStr) return 'Сегодня'
  if (dateStr === yesterdayStr) return 'Вчера'
  const dayNames = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб']
  const monthNames = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек']
  const d = new Date(dateStr + 'T00:00:00')
  return `${dayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`
}

function groupByDate(taskList) {
  const todayStr = getTodayStr()
  const groups = {}
  taskList.forEach(task => {
    const key = task.createdAt || todayStr
    if (!groups[key]) groups[key] = []
    groups[key].push(task)
  })
  return Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map(date => ({ date, tasks: groups[date] }))
}

// ── Swipe hook ───────────────────────────────────────

function useSwipeCard(cardRef, innerRef, doneBgRef, delBgRef, onComplete, onDismiss) {
  const swipe = useRef({ startX: 0, startY: 0, dx: 0, dragging: false })
  const THRESHOLD = 80

  useEffect(() => {
    const card = cardRef.current
    const inner = innerRef.current
    const doneBg = doneBgRef.current
    const delBg = delBgRef.current
    if (!card || !inner) return

    function onStart(e) {
      const t = e.touches[0]
      swipe.current = { startX: t.clientX, startY: t.clientY, dx: 0, dragging: false }
    }

    function onMove(e) {
      const t = e.touches[0]
      const dx = t.clientX - swipe.current.startX
      const dy = Math.abs(t.clientY - swipe.current.startY)
      if (!swipe.current.dragging && Math.abs(dx) < 5) return
      if (dy > Math.abs(dx) * 1.2 && !swipe.current.dragging) return
      swipe.current.dragging = true
      e.preventDefault()
      swipe.current.dx = dx
      const clamped = Math.max(-120, Math.min(120, dx))
      inner.style.transform = `translateX(${clamped}px)`
      if (clamped > 20) {
        if (doneBg) doneBg.style.opacity = Math.min(1, clamped / THRESHOLD)
        if (delBg) delBg.style.opacity = '0'
      } else if (clamped < -20) {
        if (delBg) delBg.style.opacity = Math.min(1, -clamped / THRESHOLD)
        if (doneBg) doneBg.style.opacity = '0'
      } else {
        if (doneBg) doneBg.style.opacity = '0'
        if (delBg) delBg.style.opacity = '0'
      }
    }

    function onEnd() {
      if (!swipe.current.dragging) return
      inner.style.transform = ''
      inner.style.transition = 'transform 0.25s ease'
      setTimeout(() => { inner.style.transition = '' }, 250)
      if (doneBg) doneBg.style.opacity = '0'
      if (delBg) delBg.style.opacity = '0'
      swipe.current.dragging = false
      const dx = swipe.current.dx
      if (dx > THRESHOLD) onComplete()
      else if (dx < -THRESHOLD) onDismiss()
    }

    card.addEventListener('touchstart', onStart, { passive: true })
    card.addEventListener('touchmove', onMove, { passive: false })
    card.addEventListener('touchend', onEnd)
    return () => {
      card.removeEventListener('touchstart', onStart)
      card.removeEventListener('touchmove', onMove)
      card.removeEventListener('touchend', onEnd)
    }
  }, [onComplete, onDismiss])
}

// ── TaskCard component ────────────────────────────────

function TaskCard({ task, onComplete, onDismiss, onUpdate, adding }) {
  const cardRef = useRef(null)
  const innerRef = useRef(null)
  const doneBgRef = useRef(null)
  const delBgRef = useRef(null)

  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const handleComplete = useCallback(() => onComplete(task.id), [task.id, onComplete])
  const handleDismiss = useCallback(() => onDismiss(task.id), [task.id, onDismiss])

  useSwipeCard(cardRef, innerRef, doneBgRef, delBgRef, handleComplete, handleDismiss)

  const isOver = isTaskOverdue(task)
  const isCarried = task.carriedOver && !isOver
  const isOverdueCard = isOver || task.carriedOver

  const startEdit = () => {
    setEditingId(task.id)
    setEditText(task.text)
  }

  const commitEdit = () => {
    if (editText.trim() && editText.trim() !== task.text) {
      onUpdate(task.id, editText.trim())
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit()
    else if (e.key === 'Escape') setEditingId(null)
  }

  return (
    <div
      ref={cardRef}
      className={`tasks-card${isOverdueCard ? ' tasks-card--overdue' : ''}${adding ? ' tasks-card--adding' : ''}`}
      id={`tcard-${task.id}`}
    >
      <div ref={doneBgRef} className="tasks-swipe-bg tasks-swipe-bg--done">
        <span className="tasks-swipe-icon">✓</span>
      </div>
      <div ref={delBgRef} className="tasks-swipe-bg tasks-swipe-bg--del">
        <span className="tasks-swipe-icon">🗑</span>
      </div>
      <div ref={innerRef} className="tasks-card-inner">
        <div className="tasks-check" onClick={handleComplete} />
        <div className="tasks-card-content">
          {editingId === task.id ? (
            <input
              className="tasks-card-edit-input"
              autoFocus
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
            />
          ) : (
            <div className="tasks-card-text" onDoubleClick={startEdit}>
              {task.text}
            </div>
          )}
          {(task.deadline || isOver || isCarried) && (
            <div className="tasks-card-meta">
              {task.deadline && (
                <span className={`tasks-deadline-badge${isOver ? ' tasks-deadline-badge--overdue' : ''}`}>
                  📅 {formatDeadlineBadge(task.deadline)}
                </span>
              )}
              {isOver && <span className="tasks-overdue-badge">Просрочено</span>}
              {isCarried && <span className="tasks-carried-badge">Перенесено</span>}
            </div>
          )}
        </div>
        <div className="tasks-del-btn" onClick={handleDismiss}>×</div>
      </div>
    </div>
  )
}

// ── Main TaskList component ───────────────────────────

const FILTERS = [
  { key: 'all',     label: 'Все' },
  { key: 'today',   label: 'Сегодня' },
  { key: 'overdue', label: 'Просрочено' },
]

const EMPTY_STATES = {
  all:     { icon: '📋', title: 'Нет задач',            sub: 'Добавьте первую задачу выше' },
  today:   { icon: '☀️', title: 'Нет задач на сегодня', sub: 'Добавьте задачу — она появится здесь' },
  overdue: { icon: '✅', title: 'Просроченных нет!',    sub: 'Все задачи выполнены вовремя' },
}

function TaskList({ tasks, onAdd, onComplete, onDismiss, onUpdate, showToast }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [inputValue, setInputValue] = useState('')
  const [deadlineValue, setDeadlineValue] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')
  const [showDeadline, setShowDeadline] = useState(false)
  const [addingId, setAddingId] = useState(null)
  const deadlineAreaRef = useRef(null)

  // Hide deadline picker on outside click
  useEffect(() => {
    const handle = (e) => {
      if (showDeadline && deadlineAreaRef.current && !deadlineAreaRef.current.contains(e.target)) {
        setShowDeadline(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showDeadline])

  // Filter tasks
  const todayStr = getTodayStr()
  const filteredTasks = (() => {
    switch (activeFilter) {
      case 'today':   return tasks.filter(t => t.createdAt === todayStr)
      case 'overdue': return tasks.filter(t => isTaskOverdue(t) || t.carriedOver)
      default:        return [...tasks]
    }
  })()

  const grouped = groupByDate(filteredTasks)

  const handleAdd = () => {
    const text = inputValue.trim()
    if (!text) return
    const newId = Date.now().toString()
    onAdd(text, deadlineValue, deadlineTime)
    setInputValue('')
    setDeadlineValue('')
    setDeadlineTime('')
    setShowDeadline(false)
    showToast?.('Задача добавлена')
    // Switch to all filter so new task is visible
    if (activeFilter !== 'all' && activeFilter !== 'today') {
      setActiveFilter('all')
    }
    // Add animation class
    setAddingId(newId)
    setTimeout(() => setAddingId(null), 500)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
  }

  const handleComplete = (id) => {
    onComplete(id)
    showToast?.('✓ Выполнено')
  }

  const handleDismiss = (id) => {
    onDismiss(id)
    showToast?.('Задача удалена')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Filter tabs */}
      <div className="tasks-filter-bar">
        {FILTERS.map(f => (
          <div
            key={f.key}
            className={`tasks-filter-tab${activeFilter === f.key ? ' tasks-filter-tab--active' : ''}`}
            onClick={() => setActiveFilter(f.key)}
          >
            {f.label}
          </div>
        ))}
      </div>

      {/* Add task bar */}
      <div className="tasks-add-bar" ref={deadlineAreaRef}>
        <input
          className="tasks-add-input"
          placeholder="Добавить задачу..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onFocus={() => setShowDeadline(true)}
          onKeyDown={handleKeyDown}
          maxLength={200}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <button
          className="tasks-add-btn"
          disabled={!inputValue.trim()}
          onClick={handleAdd}
        >
          +
        </button>
        {showDeadline && (
          <div className="tasks-deadline-row">
            <label className="tasks-deadline-label">Дедлайн:</label>
            <input
              type="date"
              className="tasks-deadline-date"
              max="9999-12-31"
              value={deadlineValue}
              onChange={e => setDeadlineValue(e.target.value)}
            />
            <input
              type="time"
              className="tasks-deadline-time"
              value={deadlineTime}
              onChange={e => setDeadlineTime(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="tasks-list-scroll">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty-state">
            <div className="tasks-empty-icon">{EMPTY_STATES[activeFilter].icon}</div>
            <div className="tasks-empty-title">{EMPTY_STATES[activeFilter].title}</div>
            <div className="tasks-empty-sub">{EMPTY_STATES[activeFilter].sub}</div>
          </div>
        ) : (
          grouped.map(({ date, tasks: groupTasks }) => (
            <div key={date}>
              <div className="tasks-group-label">{getGroupLabel(date)}</div>
              {groupTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={handleComplete}
                  onDismiss={handleDismiss}
                  onUpdate={onUpdate}
                  adding={task.id === addingId}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TaskList
