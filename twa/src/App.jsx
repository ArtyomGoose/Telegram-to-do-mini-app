import { useState, useEffect } from 'react'
import './App.css'
import DateBlock from './components/DateBlock'
import TaskList from './components/TaskList'
import { database, ref, onValue, set, remove } from './firebase'

function App() {
  const [tasks, setTasks] = useState([])
  const [completedToday, setCompletedToday] = useState(0)
  const [loading, setLoading] = useState(true)

  // Use a fixed user ID so all devices share the same data
  const userId = 'shared_user'

  // Debug logs
  useEffect(() => {
    console.log('App mounted')
    console.log('User ID (SHARED):', userId)
    console.log('Database:', database)
  }, [])

  // Initialize Firebase listeners on mount
  useEffect(() => {
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
  }, [])

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
