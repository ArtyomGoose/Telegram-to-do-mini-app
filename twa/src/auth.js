// Белый список разрешённых Telegram ID (строки)
export const ALLOWED_IDS = ['668356521', '668356521'] // заменить на реальные ID

// Определяем, открыто ли приложение внутри Telegram Mini App
export function isTelegramApp() {
  return !!(window.Telegram?.WebApp?.initDataUnsafe?.user)
}

// Получаем ID пользователя из Telegram SDK (только в Mini App)
export function getTelegramUserId() {
  return String(window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? '')
}

// Проверяем, есть ли ID в белом списке
export function isAllowed(telegramId) {
  return ALLOWED_IDS.includes(String(telegramId))
}
