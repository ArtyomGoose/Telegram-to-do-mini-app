function AccessDenied() {
  return (
    <div className="app-wrapper">
      <div className="auth-page">
        <div className="lock-icon">🔒</div>
        <h1>Доступ запрещён</h1>
        <p>Ваш Telegram ID не в списке разрешённых пользователей.</p>
      </div>
    </div>
  )
}

export default AccessDenied
