const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

const DAYS_RU = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда',
  'Четверг', 'Пятница', 'Суббота'
]

function DateBlock({ completedToday, totalEver }) {
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
    <div className="date-block">
      <div className="date-display">{dateString}</div>
      <div className="progress-container">
        <div className="progress-item">
          <div className="progress-label">Год</div>
          <div className="progress-bar-wrapper">
            <div
              className="progress-bar year-progress-bar"
              style={{ width: `${yearProgress}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{yearProgress.toFixed(1)}%</div>
        </div>
        <div className="progress-item">
          <div className="progress-label">День</div>
          <div className="progress-bar-wrapper">
            <div
              className="progress-bar day-progress-bar"
              style={{ width: `${dayProgress}%` }}
            ></div>
          </div>
          <div className="progress-percentage">{dayProgress.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}

export default DateBlock
