import { useState, useEffect, useRef } from 'react'
import './App.css'
import DateBlock from './components/DateBlock'
import TaskList from './components/TaskList'
import GoalsBoard from './components/GoalsBoard'
import RoutineBoard from './components/RoutineBoard'
import AccessDenied from './components/AccessDenied'
import BrowserLogin from './components/BrowserLogin'
import { database, ref, onValue, set, remove, update } from './firebase'
import { isTelegramApp, getTelegramUserId, isAllowed } from './auth'

function App() {
  // Force cache bust for Telegram
  console.log('🔄 App version: 2.0 - Auth check enabled')

  const [tasks, setTasks] = useState([])
  const [completedToday, setCompletedToday] = useState(0)
  const [goals, setGoals] = useState([])
  const [routines, setRoutines] = useState([])
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState(null) // null, 'allowed', 'denied', 'browser_login'
  const [activeTab, setActiveTab] = useState('tasks')
  const [showDeadline, setShowDeadline] = useState(false)
  const [deadlineValue, setDeadlineValue] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('')
  const deadlineAreaRef = useRef(null)

  // Use a fixed user ID so all devices share the same data
  const userId = 'shared_user'

  // Auth check on mount
  useEffect(() => {
    if (isTelegramApp()) {
      const id = getTelegramUserId()
      console.log('Telegram Mini App detected, user ID:', id)
      setAuthStatus(isAllowed(id) ? 'allowed' : 'denied')
    } else {
      // Browser — check localStorage for previously entered ID
      const saved = localStorage.getItem('twa_browser_id')
      if (saved && isAllowed(saved)) {
        console.log('Browser mode, valid ID from localStorage:', saved)
        setAuthStatus('allowed')
      } else {
        console.log('Browser mode, need manual ID input')
        setAuthStatus('browser_login')
      }
    }
  }, [])

  // Initialize Firebase listeners only when auth is allowed
  useEffect(() => {
    if (authStatus !== 'allowed') return

    const today = new Date().toISOString().slice(0, 10)
    console.log('Setting up Firebase listeners for user:', userId)

    // Check if day changed
    const checkDayChange = () => {
      const storedLastDate = localStorage.getItem('twa_last_date')
      if (storedLastDate && storedLastDate !== today) {
        // Day has changed, mark all tasks as carried over
        const tasksRef = ref(database, `users/${userId}/tasks`)
        onValue(tasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const tasksData = snapshot.val()
            Object.keys(tasksData).forEach((taskId) => {
              const task = tasksData[taskId]
              if (!task.carriedOver) {
                set(ref(database, `users/${userId}/tasks/${taskId}/carriedOver`), true)
              }
            })
          }
        }, { onlyOnce: true })

        // Reset completed counter
        set(ref(database, `users/${userId}/completedToday`), 0)
      }
      localStorage.setItem('twa_last_date', today)
    }

    checkDayChange()

    // Subscribe to tasks
    const tasksRef = ref(database, `users/${userId}/tasks`)
    console.log('Tasks ref path:', `users/${userId}/tasks`)
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
      console.log('Tasks snapshot received:', snapshot.exists(), snapshot.val())
      if (snapshot.exists()) {
        const tasksData = snapshot.val()
        const tasksArray = Object.entries(tasksData).map(([id, task]) => ({
          id,
          ...task
        }))
        setTasks(tasksArray)
      } else {
        setTasks([])
      }
      setLoading(false)
    }, (error) => {
      console.error('Tasks listener error:', error)
    })

    // Subscribe to completed counter
    const completedRef = ref(database, `users/${userId}/completedToday`)
    const unsubscribeCompleted = onValue(completedRef, (snapshot) => {
      console.log('Completed snapshot:', snapshot.val())
      if (snapshot.exists() && snapshot.val() !== null) {
        setCompletedToday(snapshot.val())
      } else {
        // Initialize to 0 if doesn't exist
        set(completedRef, 0)
        setCompletedToday(0)
      }
    }, (error) => {
      console.error('Completed listener error:', error)
    })

    // Subscribe to goals
    const goalsRef = ref(database, `users/${userId}/goals`)
    const unsubscribeGoals = onValue(goalsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const arr = Object.entries(data)
          .map(([id, g]) => ({ id, ...g }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        setGoals(arr)
      } else {
        setGoals([])
      }
    }, (error) => {
      console.error('Goals listener error:', error)
    })

    // Subscribe to routines
    const routinesRef = ref(database, `users/${userId}/routines`)
    const unsubscribeRoutines = onValue(routinesRef, (snapshot) => {
      if (snapshot.exists()) {
        const arr = Object.entries(snapshot.val())
          .map(([id, r]) => ({ id, ...r }))
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        setRoutines(arr)
      } else {
        setRoutines([])
      }
    }, (error) => {
      console.error('Routines listener error:', error)
    })

    return () => {
      unsubscribeTasks()
      unsubscribeCompleted()
      unsubscribeGoals()
      unsubscribeRoutines()
    }
  }, [authStatus])

  // Real-time overnight check every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const today = new Date().toISOString().slice(0, 10)
      const storedLastDate = localStorage.getItem('twa_last_date')

      if (storedLastDate && storedLastDate !== today) {
        // Day has changed
        const tasksRef = ref(database, `users/${userId}/tasks`)
        onValue(tasksRef, (snapshot) => {
          if (snapshot.exists()) {
            const tasksData = snapshot.val()
            Object.keys(tasksData).forEach((taskId) => {
              const task = tasksData[taskId]
              if (!task.carriedOver) {
                set(ref(database, `users/${userId}/tasks/${taskId}/carriedOver`), true)
              }
            })
          }
        }, { onlyOnce: true })

        set(ref(database, `users/${userId}/completedToday`), 0)
        localStorage.setItem('twa_last_date', today)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [userId])

  // Hide deadline fields when clicking outside the deadline area
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showDeadline && deadlineAreaRef.current && !deadlineAreaRef.current.contains(e.target)) {
        setShowDeadline(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDeadline])

  const addTask = (text, deadline, time) => {
    const today = new Date().toISOString().slice(0, 10)
    const taskId = Date.now().toString()
    let taskText = text
    if (deadline) {
      const [, month, day] = deadline.split('-')
      const timeSuffix = time ? ` ${time}` : ''
      taskText = `${text} · ${day}.${month}${timeSuffix}`
    }
    const deadlineStored = deadline
      ? (time ? `${deadline}T${time}` : deadline)
      : undefined
    const newTask = {
      id: taskId,
      text: taskText,
      createdAt: today,
      carriedOver: false,
      ...(deadlineStored ? { deadline: deadlineStored } : {})
    }

    console.log('Adding task:', newTask)
    set(ref(database, `users/${userId}/tasks/${taskId}`), newTask)
      .then(() => console.log('Task added successfully'))
      .catch((error) => console.error('Error adding task:', error))
  }

  const updateTask = (taskId, newText) => {
    update(ref(database, `users/${userId}/tasks/${taskId}`), { text: newText })
      .catch((error) => console.error('Error updating task:', error))
  }

  const completeTask = (taskId) => {
    console.log('Completing task:', taskId)
    // Remove task from Firebase
    remove(ref(database, `users/${userId}/tasks/${taskId}`))
      .then(() => console.log('Task removed successfully'))
      .catch((error) => console.error('Error removing task:', error))

    // Increment completed counter
    set(ref(database, `users/${userId}/completedToday`), completedToday + 1)
      .then(() => console.log('Completed counter updated'))
      .catch((error) => console.error('Error updating counter:', error))
  }

  const dismissTask = (taskId) => {
    console.log('Dismissing task:', taskId)
    remove(ref(database, `users/${userId}/tasks/${taskId}`))
      .then(() => console.log('Task dismissed successfully'))
      .catch((error) => console.error('Error dismissing task:', error))
  }

  const addGoal = (goal) => {
    set(ref(database, `users/${userId}/goals/${goal.id}`), goal)
      .catch((error) => console.error('Error adding goal:', error))
  }

  const updateGoal = (id, changes) => {
    update(ref(database, `users/${userId}/goals/${id}`), changes)
      .catch((error) => console.error('Error updating goal:', error))
  }

  const deleteGoal = (id) => {
    remove(ref(database, `users/${userId}/goals/${id}`))
      .catch((error) => console.error('Error deleting goal:', error))
  }

  const reorderGoals = (newOrder) => {
    newOrder.forEach(({ id, order }) =>
      update(ref(database, `users/${userId}/goals/${id}`), { order })
        .catch((error) => console.error('Error reordering goal:', error))
    )
  }

  const addRoutine = (r) => {
    set(ref(database, `users/${userId}/routines/${r.id}`), r)
      .catch((error) => console.error('Error adding routine:', error))
  }

  const updateRoutine = (id, changes) => {
    update(ref(database, `users/${userId}/routines/${id}`), changes)
      .catch((error) => console.error('Error updating routine:', error))
  }

  const deleteRoutine = (id) => {
    remove(ref(database, `users/${userId}/routines/${id}`))
      .catch((error) => console.error('Error deleting routine:', error))
  }

  const toggleRoutineDay = (id, date) => {
    const routine = routines.find((r) => r.id === id)
    const done = routine?.completions?.[date]
    if (done) {
      remove(ref(database, `users/${userId}/routines/${id}/completions/${date}`))
        .catch((error) => console.error('Error toggling routine:', error))
    } else {
      set(ref(database, `users/${userId}/routines/${id}/completions/${date}`), true)
        .catch((error) => console.error('Error toggling routine:', error))
    }
  }

  const totalEver = completedToday + tasks.length

  // Auth gates
  if (authStatus === null) {
    return (
      <div className="app-wrapper">
        <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  if (authStatus === 'denied') {
    return (
      <AccessDenied
        onRetry={isTelegramApp() ? undefined : () => {
          localStorage.removeItem('twa_browser_id')
          setAuthStatus('browser_login')
        }}
      />
    )
  }

  if (authStatus === 'browser_login') {
    return (
      <BrowserLogin
        onLogin={(id) => {
          if (isAllowed(id)) {
            localStorage.setItem('twa_browser_id', id)
            setAuthStatus('allowed')
          } else {
            setAuthStatus('denied')
          }
        }}
      />
    )
  }

  if (loading) {
    return (
      <div className="app-wrapper">
        <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  return (
    <div className="app-wrapper">
      {activeTab === 'tasks' && (
        <>
          <div className="app-header">
            <DateBlock completedToday={completedToday} totalEver={totalEver} />
            <div ref={deadlineAreaRef}>
              <div className="task-input-wrapper">
                <input
                  type="text"
                  className="task-input"
                  placeholder="Добавить задачу..."
                  id="task-input"
                  onFocus={() => setShowDeadline(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = document.getElementById('task-input')
                      if (input.value.trim()) {
                        addTask(input.value.trim(), deadlineValue, deadlineTime)
                        input.value = ''
                        setDeadlineValue('')
                        setDeadlineTime('')
                        setShowDeadline(false)
                      }
                    }
                  }}
                />
                <button
                  className="add-button"
                  onClick={() => {
                    const input = document.getElementById('task-input')
                    if (input.value.trim()) {
                      addTask(input.value.trim(), deadlineValue, deadlineTime)
                      input.value = ''
                      setDeadlineValue('')
                      setDeadlineTime('')
                      setShowDeadline(false)
                    }
                  }}
                >
                  +
                </button>
              </div>
              {showDeadline && (
                <div className="deadline-input-wrapper">
                  <label className="deadline-label">Дедлайн:</label>
                  <input
                    type="date"
                    className="deadline-input"
                    max="9999-12-31"
                    value={deadlineValue}
                    onChange={(e) => setDeadlineValue(e.target.value)}
                  />
                  <input
                    type="time"
                    className="deadline-time-input"
                    value={deadlineTime}
                    onChange={(e) => setDeadlineTime(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="app-tasks-scroll">
            <TaskList tasks={tasks} onAdd={addTask} onComplete={completeTask} onDismiss={dismissTask} onUpdate={updateTask} isHeaderSeparated={true} />
          </div>
        </>
      )}
      {activeTab === 'goals' && (
        <GoalsBoard
          goals={goals}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onDelete={deleteGoal}
          onReorder={reorderGoals}
        />
      )}
      {activeTab === 'routine' && (
        <RoutineBoard
          routines={routines}
          onAdd={addRoutine}
          onUpdate={updateRoutine}
          onDelete={deleteRoutine}
          onToggleDay={toggleRoutineDay}
        />
      )}

      <nav className="app-tabs">
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="9" y1="6" x2="20" y2="6" />
            <line x1="9" y1="12" x2="20" y2="12" />
            <line x1="9" y1="18" x2="20" y2="18" />
            <polyline points="4 6 5.5 7.5 7 6" />
            <polyline points="4 12 5.5 13.5 7 12" />
            <polyline points="4 18 5.5 19.5 7 18" />
          </svg>
        </button>
        <button
          className={`tab-btn ${activeTab === 'goals' ? 'active' : ''}`}
          onClick={() => setActiveTab('goals')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        </button>
        <button
          className={`tab-btn ${activeTab === 'routine' ? 'active' : ''}`}
          onClick={() => setActiveTab('routine')}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </nav>
    </div>
  )
}

export default App
