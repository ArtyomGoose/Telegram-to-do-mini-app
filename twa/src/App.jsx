import { useState, useEffect } from 'react'
import './App.css'
import DateBlock from './components/DateBlock'
import TaskList from './components/TaskList'

function App() {
  const [tasks, setTasks] = useState([])
  const [completedToday, setCompletedToday] = useState(0)

  // Initialize from localStorage on mount
  useEffect(() => {
    const storedTasks = localStorage.getItem('twa_tasks')
    const storedCompletedToday = localStorage.getItem('twa_completed_today')
    const storedLastDate = localStorage.getItem('twa_last_date')

    const today = new Date().toISOString().slice(0, 10)

    // Parse stored tasks
    const parsedTasks = storedTasks ? JSON.parse(storedTasks) : []

    // Day-change detection
    if (storedLastDate && storedLastDate !== today) {
      // Mark all non-carried-over tasks as carried over
      const updatedTasks = parsedTasks.map(task => ({
        ...task,
        carriedOver: task.carriedOver || true
      }))
      setTasks(updatedTasks)
      localStorage.setItem('twa_tasks', JSON.stringify(updatedTasks))
      setCompletedToday(0)
      localStorage.setItem('twa_completed_today', '0')
    } else {
      setTasks(parsedTasks)
      setCompletedToday(storedCompletedToday ? parseInt(storedCompletedToday, 10) : 0)
    }

    // Update last date
    localStorage.setItem('twa_last_date', today)
  }, [])

  // Real-time overnight check every 60s
  useEffect(() => {
    const interval = setInterval(() => {
      const storedLastDate = localStorage.getItem('twa_last_date')
      const today = new Date().toISOString().slice(0, 10)

      if (storedLastDate && storedLastDate !== today) {
        // Day has changed, trigger reload or update
        const storedTasks = localStorage.getItem('twa_tasks')
        const parsedTasks = storedTasks ? JSON.parse(storedTasks) : []

        const updatedTasks = parsedTasks.map(task => ({
          ...task,
          carriedOver: task.carriedOver || true
        }))
        setTasks(updatedTasks)
        localStorage.setItem('twa_tasks', JSON.stringify(updatedTasks))
        setCompletedToday(0)
        localStorage.setItem('twa_completed_today', '0')
        localStorage.setItem('twa_last_date', today)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const addTask = (text) => {
    const today = new Date().toISOString().slice(0, 10)
    const newTask = {
      id: Date.now(),
      text,
      createdAt: today,
      carriedOver: false
    }
    const updatedTasks = [...tasks, newTask]
    setTasks(updatedTasks)
    localStorage.setItem('twa_tasks', JSON.stringify(updatedTasks))
  }

  const completeTask = (id) => {
    const updatedTasks = tasks.filter(task => task.id !== id)
    setTasks(updatedTasks)
    localStorage.setItem('twa_tasks', JSON.stringify(updatedTasks))

    const newCompletedToday = completedToday + 1
    setCompletedToday(newCompletedToday)
    localStorage.setItem('twa_completed_today', newCompletedToday.toString())
  }

  const totalEver = completedToday + tasks.length

  return (
    <div className="app-container">
      <DateBlock completedToday={completedToday} totalEver={totalEver} />
      <TaskList tasks={tasks} onAdd={addTask} onComplete={completeTask} />
    </div>
  )
}

export default App
