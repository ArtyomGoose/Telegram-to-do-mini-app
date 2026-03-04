import { useState } from 'react'

function TaskList({ tasks, onAdd, onComplete, isHeaderSeparated }) {
  const [inputValue, setInputValue] = useState('')

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
          >
            <span className="task-text">{task.text}</span>
            <button
              className="complete-button"
              onClick={() => onComplete(task.id)}
            >
              ✓
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default TaskList
