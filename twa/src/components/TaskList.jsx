import { useState, useRef } from 'react'

function TaskList({ tasks, onAdd, onComplete }) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  const handleAddTask = () => {
    if (inputValue.trim()) {
      onAdd(inputValue.trim())
      setInputValue('')

      // Close keyboard on mobile
      if (inputRef.current) {
        inputRef.current.blur()
      }
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAddTask()
      // Close keyboard after Enter
      if (inputRef.current) {
        inputRef.current.blur()
      }
    }
  }

  return (
    <div className="task-list">
      <div className="task-input-wrapper">
        <input
          ref={inputRef}
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
