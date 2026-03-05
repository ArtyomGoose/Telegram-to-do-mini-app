# Project: Telegram Mini App with Access Control

## Overview

A Telegram Mini App (TWA) built with React + Vite that tracks daily tasks with real-time synchronization via Firebase. Features include:
- Task management with completion tracking
- Daily and yearly progress bars (Russian localization)
- Access control: whitelist-based authentication by Telegram user ID
- Real-time synchronization across devices
- Dark Telegram theme

## Technology Stack

- **Frontend:** React 18, Vite 7
- **Backend:** Firebase Realtime Database
- **Styling:** CSS with Telegram theme variables
- **Localization:** Russian (dates, UI text)

## Project Structure

```
project3/
├── CLAUDE.md                    # This file (English)
├── CLAUDE_RU.md                 # Russian version (for reference)
├── README.md
├── bot.py                       # Python Telegram bot (separate from TWA)
├── test_api.py
└── twa/                         # Telegram Web App
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── src/
    │   ├── main.jsx
    │   ├── App.jsx              # Main app with auth gate
    │   ├── App.css              # Styles (dark theme + auth pages)
    │   ├── index.css            # Global styles
    │   ├── auth.js              # Auth utilities and whitelist
    │   ├── firebase.js          # Firebase config and exports
    │   └── components/
    │       ├── DateBlock.jsx    # Date + progress bars
    │       ├── TaskList.jsx     # Task list UI
    │       ├── AccessDenied.jsx # Error page (access denied)
    │       └── BrowserLogin.jsx # Login form (browser only)
    └── dist/                    # Production build (after `npm run build`)
```

## Key Features

### 1. Access Control (Whitelist)

**Location:** `twa/src/auth.js`

Three authentication scenarios:

1. **Telegram Mini App:** User ID is extracted from `window.Telegram.WebApp.initDataUnsafe.user.id` and checked against the whitelist instantly.
2. **Browser + Previously Saved ID:** If user visited before, their ID is retrieved from `localStorage.getItem('twa_browser_id')` and validated.
3. **Browser + First Visit:** Login form appears, user manually enters their Telegram ID, then checked against the whitelist.

**Whitelist:** Currently hardcoded in `auth.js` as `ALLOWED_IDS = ['123456789', '987654321']`. Replace with real IDs.

**Auth States:**
- `null` → Checking auth
- `'allowed'` → User can access app
- `'denied'` → AccessDenied page shown
- `'browser_login'` → Login form shown

### 2. Task Management

**Location:** `twa/src/App.jsx`

- Add tasks with `addTask(text)` → stores in Firebase under `users/shared_user/tasks/{id}`
- Complete tasks with `completeTask(id)` → removes from list, increments `completedToday` counter
- All authenticated users share the same task list (hardcoded `userId = 'shared_user'`)

### 3. Day-Change Detection

Runs on app mount and every 60 seconds:
- Compares stored date (`localStorage.twa_last_date`) with current date
- If dates differ: marks all incomplete tasks as `carriedOver: true` (displayed in red)
- Resets `completedToday` counter to 0

### 4. Progress Bars

**Location:** `twa/src/components/DateBlock.jsx`

- **Year Progress:** Days elapsed / days in year (accounts for leap years)
- **Day Progress:** Tasks completed today / total tasks started today
- Formatted as "Пятница, 27 февраля" (Russian localization)

### 5. Firebase Realtime Sync

**Location:** `twa/src/firebase.js`

- Real-time listeners on tasks and completed counter
- Data structure:
  ```
  users/
    shared_user/
      tasks/
        {id}: { id, text, createdAt, carriedOver }
      completedToday: {number}
  ```
- Listeners only start after auth is confirmed

## Development

### Prerequisites
- Node.js 16+
- Firebase project with Realtime Database
- Telegram Bot (for Mini App integration)

### Setup

```bash
cd twa
npm install
npm run dev      # Start dev server on http://localhost:5173
```

### Build

```bash
npm run build    # Creates dist/ folder
npm run preview  # Preview production build locally
```

## Deployment

1. Run `npm run build` in `/twa`
2. Deploy `dist/` folder to a static hosting service (e.g., Vercel)
3. Register the URL in BotFather for your Telegram bot

## Configuration

### Firebase Credentials

Edit `twa/src/firebase.js` to update Firebase config if needed.

### Whitelist IDs

Edit `twa/src/auth.js`:
```js
export const ALLOWED_IDS = ['YOUR_ID_1', 'YOUR_ID_2']
```

## Important Notes

- **Shared Task List:** All authenticated users see and modify the same task list. To switch to per-user data, change `userId` from `'shared_user'` to the authenticated user's ID.
- **localStorage Keys:**
  - `twa_last_date` — Last app open date (YYYY-MM-DD)
  - `twa_browser_id` — User-entered Telegram ID (browser only)
- **Telegram SDK:** Loaded synchronously in `index.html` before any other scripts. Optional chaining (`?.`) guards against missing SDK in plain browser mode.

## File Ownership

- **Python bot files** (`bot.py`, `test_api.py`) — Not touched by TWA. Managed separately.
- **TWA files** (`twa/` directory) — Main focus. All auth/task/sync logic lives here.

## Recent Changes

- Added access control system with whitelist authentication
- Created auth gate in App.jsx with Telegram Mini App + browser modes
- Added AccessDenied and BrowserLogin components
- Integrated auth checks into Firebase listener startup
- Fixed UI: removed number spinner from browser login form
- Added retry button for browser mode (hidden in Telegram Mini App)
- Optimized cache handling for Telegram Desktop

## UI Behavior by Platform

### Telegram Mini App
- Auto-check user ID from SDK
- Shows AccessDenied page without retry button (read-only error state)
- No manual login form needed

### Browser Mode
- Shows manual ID input form on first visit
- Saves ID to localStorage for future visits
- Shows "Попробовать снова" (retry) button on AccessDenied page
- Allows trying different IDs

## Next Steps (Optional)

- Switch from shared task list to per-user data (change `userId` logic)
- Add user profile display with Telegram avatar/name
- Add task editing or scheduling features
- Move whitelist to Firebase for dynamic management

---

**Last Updated:** 2026-03-05
