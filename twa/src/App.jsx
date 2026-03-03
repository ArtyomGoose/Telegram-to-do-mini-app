import { useState, useEffect } from 'react'
import './App.css'
import DateBlock from './components/DateBlock'
import TaskList from './components/TaskList'
import { database, ref, onValue, set, remove } from './firebase'

function App() {
  const [tasks, setTasks] = useState([])
  const [completedToday, setCompletedToday] = useState(0)
  const [loading, setLoading] = useState(true)

  // Generate unique user ID (stays same per device/browser)
  const getUserId = () => {
    let userId = localStorage.getItem('user_id')
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('user_id', userId)
    }
    return userId
  }

  const userId = getUserId()

  // Initialize Firebase listeners on mount
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)

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
    const unsubscribeTasks = onValue(tasksRef, (snapshot) => {
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
    })

    // Subscribe to completed counter
    const completedRef = ref(database, `users/${userId}/completedToday`)
    const unsubscribeCompleted = onValue(completedRef, (snapshot) => {
      if (snapshot.exists()) {
        setCompletedToday(snapshot.val())
      } else {
        setCompletedToday(0)
      }
    })

    return () => {
      unsubscribeTasks()
      unsubscribeCompleted()
    }
  }, [userId])

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

    set(ref(database, `users/${userId}/tasks/${taskId}`), newTask)
  }

  const completeTask = (taskId) => {
    // Remove task from Firebase
    remove(ref(database, `users/${userId}/tasks/${taskId}`))

    // Increment completed counter
    set(ref(database, `users/${userId}/completedToday`), completedToday + 1)
  }

  const totalEver = completedToday + tasks.length

  if (loading) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '20px', color: '#fff' }}>
          Загрузка...
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <DateBlock completedToday={completedToday} totalEver={totalEver} />
      <TaskList tasks={tasks} onAdd={addTask} onComplete={completeTask} />
    </div>
  )
}

export default App
