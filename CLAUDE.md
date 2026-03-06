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
- **Backend:** Firebase Realtime Database + Python Telegram Bot
- **Bot integration:** Vercel Serverless Function (Python 3.12)
- **Styling:** CSS with Telegram theme variables
- **Localization:** Russian (dates, UI text)

## Project Structure

```
project3/
├── CLAUDE.md                    # This file (English)
├── CLAUDE_RU.md                 # Russian version (for reference)
├── README.md
├── bot.py                       # Python Telegram bot (local polling mode)
├── requirements.txt             # Python dependencies for local bot
├── .env                         # Local env vars (BOT_TOKEN, FIREBASE_CREDENTIALS_PATH)
├── .gitignore                   # Excludes .env and serviceAccount.json
├── vercel.json                  # Vercel config (functions runtime)
└── twa/                         # Telegram Web App
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── api/
    │   ├── webhook.py           # Vercel Serverless Function (webhook handler)
    │   └── requirements.txt     # Python dependencies for Vercel
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

### 6. Telegram Bot Integration

**Location:** `twa/api/webhook.py` (Vercel) + `bot.py` (local)

Two modes of bot operation:

1. **Vercel Webhook (production):** `twa/api/webhook.py` runs as a Vercel Serverless Function. Telegram sends POST requests to `https://telegram-to-do-mini-app.vercel.app/api/webhook` on every message.
2. **Local Polling (development):** `bot.py` runs locally with `py -3.13 bot.py`.

**Flow:** User sends message to bot → webhook receives it → writes task to Firebase → TWA real-time listener fires → task appears in UI instantly.

**Setup endpoint:** `GET /api/webhook?setup=1` — registers the webhook URL with Telegram (call once after deploy).

**Whitelist:** Same `ALLOWED_IDS` as `twa/src/auth.js` — only whitelisted users can create tasks via bot.

**Vercel Environment Variables required:**
- `BOT_TOKEN` — Telegram bot token
- `FB_PROJECT_ID` — Firebase project ID
- `FB_PRIVATE_KEY_ID` — Service account private key ID
- `FB_PRIVATE_KEY` — Service account private key (Base64 encoded)
- `FB_CLIENT_EMAIL` — Service account client email
- `FB_CLIENT_ID` — Service account client ID
- `FB_CLIENT_CERT_URL` — Service account client cert URL

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

### Vercel (production)

1. Connect GitHub repo to Vercel
2. In Vercel Dashboard → Settings → General:
   - **Root Directory:** `twa`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add all `FB_*` and `BOT_TOKEN` environment variables in Settings → Environment Variables
4. Push to GitHub — Vercel deploys automatically
5. Register webhook once: open `https://telegram-to-do-mini-app.vercel.app/api/webhook?setup=1` in browser

### Local bot (development/alternative)

```bash
py -3.13 bot.py
```

Requires `.env` with `BOT_TOKEN` and `FIREBASE_CREDENTIALS_PATH`.

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

- **Local bot** (`bot.py`, `requirements.txt`, `.env`) — Local polling mode. Not deployed to Vercel.
- **Vercel webhook** (`twa/api/webhook.py`, `twa/api/requirements.txt`) — Production bot handler. Deployed automatically with the TWA.
- **TWA files** (`twa/src/`) — Main focus. All auth/task/sync logic lives here.

## Recent Changes

- Added access control system with whitelist authentication
- Created auth gate in App.jsx with Telegram Mini App + browser modes
- Added AccessDenied and BrowserLogin components
- Integrated auth checks into Firebase listener startup
- Fixed UI: removed number spinner from browser login form
- Added retry button for browser mode (hidden in Telegram Mini App)
- Optimized cache handling for Telegram Desktop
- Added local Python bot (`bot.py`) with Firebase Admin SDK integration
- Added Vercel Serverless webhook (`twa/api/webhook.py`) for production bot
- Firebase credentials stored as separate env vars with Base64-encoded private key

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

**Last Updated:** 2026-03-06
