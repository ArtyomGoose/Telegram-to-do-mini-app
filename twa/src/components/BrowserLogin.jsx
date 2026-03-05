import { useState } from 'react'

function BrowserLogin({ onLogin }) {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onLogin(inputValue.trim())
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="app-wrapper">
      <div className="auth-page">
        <h1>Войти</h1>
        <p>Введите ваш Telegram ID</p>
        <input
          type="text"
          className="auth-input"
          placeholder="Ваш ID"
          value={inputValue}
          onChange={(e) => {
            // Only allow numeric input
            const numericValue = e.target.value.replace(/\D/g, '')
            setInputValue(numericValue)
          }}
          onKeyDown={handleKeyDown}
          autoFocus
          inputMode="numeric"
        />
        <button className="auth-button" onClick={handleSubmit}>
          Войти
        </button>
      </div>
    </div>
  )
}

export default BrowserLogin
