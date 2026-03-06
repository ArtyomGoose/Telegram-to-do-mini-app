import { useState, useEffect } from 'react'
import './App.css'
import DateBlock from './components/DateBlock'
import TaskList from './components/TaskList'
import AccessDenied from './components/AccessDenied'
import BrowserLogin from './components/BrowserLogin'
import { database, ref, onValue, set, remove, update } from './firebase'
import { isTelegramApp, getTelegramUserId, isAllowed } from './auth'

function App() {
  // Force cache bust for Telegram
  console.log('🔄 App version: 2.0 - Auth check enabled')

  const [tasks, setTasks] = useState([])
  const [completedToday, setCompletedToday] = useState(0)
  const [loading, setLoading] = useState(true)
  const [authStatus, setAuthStatus] = useState(null) // null, 'allowed', 'denied', 'browser_login'

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

    return () => {
      unsubscribeTasks()
      unsubscribeCompleted()
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

  const addTask = (text) => {
    const today = new Date().toISOString().slice(0, 10)
    const taskId = Date.now().toString()
    const newTask = {
      id: taskId,
      text,
      createdAt: today,
      carriedOver: false
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
      <div className="app-header">
        <DateBlock completedToday={completedToday} totalEver={totalEver} />
        <div className="task-input-wrapper">
          <input
            type="text"
            className="task-input"
            placeholder="Добавить задачу..."
            id="task-input"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const input = document.getElementById('task-input')
                if (input.value.trim()) {
                  addTask(input.value.trim())
                  input.value = ''
                }
              }
            }}
          />
          <button
            className="add-button"
            onClick={() => {
              const input = document.getElementById('task-input')
              if (input.value.trim()) {
                addTask(input.value.trim())
                input.value = ''
              }
            }}
          >
            +
          </button>
        </div>
      </div>
      <div className="app-tasks-scroll">
        <TaskList tasks={tasks} onAdd={addTask} onComplete={completeTask} onUpdate={updateTask} isHeaderSeparated={true} />
      </div>
    </div>
  )
}

export default App
