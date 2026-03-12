import { useState } from 'react'

function getDeadlineColor(task) {
  if (!task.deadline) return undefined
  const created = new Date(task.createdAt).getTime()
  const deadline = new Date(task.deadline).getTime()
  const now = Date.now()
  if (deadline <= created) return 'rgba(255,107,107,0.35)'
  const ratio = (now - created) / (deadline - created)
  if (ratio >= 0.8) return 'rgba(255,107,107,0.35)'
  if (ratio >= 0.5) return 'rgba(255,193,7,0.3)'
  return 'rgba(76,175,80,0.25)'
}

function TaskList({ tasks, onAdd, onComplete, onDismiss, onUpdate, isHeaderSeparated }) {
  const [inputValue, setInputValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')

  const handleAddTask = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddTask()
    }
  }

  const startEdit = (task) => {
    setEditingId(task.id)
    setEditText(task.text)
  }

  const commitEdit = (originalText) => {
    if (editText.trim() && editText.trim() !== originalText) {
      onUpdate(editingId, editText.trim())
    }
    setEditingId(null)
  }

  const handleEditKeyDown = (e, originalText) => {
    if (e.key === 'Enter') {
      commitEdit(originalText)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  return (
    <div className="task-list">
      {!isHeaderSeparated && (
        <div className="task-input-wrapper">
          <input
            type="text"
            className="task-input"
            placeholder="Добавить задачу..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="add-button" onClick={handleAddTask}>
            +
          </button>
        </div>
      )}
      <ul className="tasks-list">
        {tasks.map((task) => (
          <li
            key={task.id}
            className={`task-item ${task.carriedOver ? 'carried-over' : ''}`}
            style={{ backgroundColor: getDeadlineColor(task) }}
          >
            {editingId === task.id ? (
              <input
                className="task-edit-input"
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => commitEdit(task.text)}
                onKeyDown={(e) => handleEditKeyDown(e, task.text)}
              />
            ) : (
              <span
                className="task-text"
                onDoubleClick={() => startEdit(task)}
              >
                {task.text}
              </span>
            )}
            <button
              className="complete-button"
              onClick={() => onComplete(task.id)}
            >
              ✓
            </button>
            <button
              className="dismiss-button"
              onClick={() => onDismiss(task.id)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TaskList
