const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

const DAYS_RU = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
  'Четверг', 'Пятница', 'Суббота'
]

function DateBlock({ completedToday, totalEver, subtitle, showToast }) {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const date = today.getDate()
  const dayOfWeek = today.getDay()

  // Russian date string: "Пятница, 27 февраля"
  const dateString = `${DAYS_RU[dayOfWeek]}, ${date} ${MONTHS_RU[month]}`

  // Year progress calculation
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInYear = isLeapYear ? 366 : 365
  const dayOfYear = Math.floor((today - new Date(year, 0, 0)) / 86400000)
  const yearProgress = (dayOfYear / daysInYear) * 100

  // Day progress calculation
  const dayProgress = totalEver > 0 ? (completedToday / totalEver) * 100 : 0

  return (
    <div className="tasks-header">
      <div className="tasks-header-top">
        <div>
          <div className="tasks-date-title">{dateString}</div>
          <div className="tasks-date-sub">{subtitle || 'Сегодня'}</div>
        </div>
        <div className="tasks-header-actions">
          <div
            className="tasks-btn-icon"
            onClick={() => showToast?.('📅 Календарь — скоро')}
          >
            📅
          </div>
          <div
            className="tasks-btn-icon"
            onClick={() => showToast?.('⚙️ Настройки — скоро')}
          >
            ⚙️
          </div>
        </div>
      </div>
      <div className="tasks-progress-section">
        <div className="tasks-progress-row">
          <span className="tasks-progress-label">Год</span>
          <div className="tasks-progress-track">
            <div
              className="tasks-progress-fill tasks-progress-fill--year"
              style={{ width: `${yearProgress}%` }}
            />
          </div>
          <span className="tasks-progress-pct">{yearProgress.toFixed(1)}%</span>
        </div>
        <div className="tasks-progress-row">
          <span className="tasks-progress-label">День</span>
          <div className="tasks-progress-track">
            <div
              className="tasks-progress-fill tasks-progress-fill--day"
              style={{ width: `${dayProgress}%` }}
            />
          </div>
          <span className="tasks-progress-pct">{dayProgress.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}

export default DateBlock
