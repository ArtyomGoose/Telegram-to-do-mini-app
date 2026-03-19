# Project: Telegram Mini App with Access Control

## Overview

A Telegram Mini App (TWA) built with React + Vite that tracks daily tasks and goals with real-time synchronization via Firebase. Features include:
- Task management with completion tracking and deadlines
- Goals / Vision Board with photo mosaic layout
- Sport tracker with categories, exercises, logs, and progress charts
- Bottom tab bar navigation (Tasks, Goals, Routine, Sport)
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
    │   ├── App.jsx              # Main app with auth gate + tab routing
    │   ├── App.css              # Styles (dark theme + all components)
    │   ├── index.css            # Global styles
    │   ├── auth.js              # Auth utilities and whitelist
    │   ├── firebase.js          # Firebase config and exports
    │   └── components/
    │       ├── DateBlock.jsx    # Date + progress bars
    │       ├── TaskList.jsx     # Task list UI
    │       ├── GoalsBoard.jsx   # Vision Board (Goals tab)
    │       ├── SportsBoard.jsx  # Sport tracker (Sport tab)
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

### 2. Bottom Tab Bar

**Location:** `twa/src/App.jsx` (state: `activeTab`)

Three tabs, icons only, at the bottom of the screen:
- **Задачи** (Tasks) — checklist icon
- **Цели** (Goals) — target icon
- **Рутина** (Routine) — refresh icon (placeholder, empty)

Active tab icon: 28px, accent color. Inactive: 24px, hint color. Smooth CSS transition.

### 3. Task Management

**Location:** `twa/src/App.jsx`

- Add tasks with `addTask(text, deadline?, time?)` → stores in Firebase under `users/shared_user/tasks/{id}`
- Complete tasks with `completeTask(id)` → removes from list, increments `completedToday` counter
- Dismiss tasks with `dismissTask(id)` → removes from list **without** incrementing counter (task skipped, not counted in progress)
- All authenticated users share the same task list (hardcoded `userId = 'shared_user'`)

#### Deadlines

- Click on the task input field → date + time pickers appear below it; clicking outside hides them
- After pressing `+` or Enter, the pickers hide
- Year input is limited to 4 digits (`max="9999-12-31"`)
- If no date selected: task added as usual
- If date selected (no time): ` · DD.MM` is appended to task text, `deadline: "YYYY-MM-DD"` stored in Firebase
- If date + time selected: ` · DD.MM HH:MM` is appended to task text, `deadline: "YYYY-MM-DDTHH:MM"` stored in Firebase
- Task background color indicates time remaining (calculated on page load/refresh):
  - Green `rgba(76,175,80,0.25)` — less than 50% of time elapsed
  - Yellow `rgba(255,193,7,0.3)` — 50–80% elapsed
  - Red `rgba(255,107,107,0.35)` — more than 80% elapsed or overdue
- Smooth CSS transition: `background-color 0.8s ease`
- Color is recalculated on every app open/page refresh (not in real-time)

### 4. Goals / Vision Board

**Location:** `twa/src/components/GoalsBoard.jsx`

Mosaic photo grid where each cell represents a goal.

#### Layout
- CSS Grid, 2 columns, square cells
- Small cell: 1×1 (default), Large cell: 2×1 (full width)
- Each cell: photo fills the cell, emoji + title label overlaid at bottom

#### Goal Data Structure (Firebase: `users/shared_user/goals/{id}`)
```
id: string
title: string
emoji: string
description: string
deadline: string | null     // "YYYY-MM-DD"
imageBase64: string | null  // JPEG compressed to 1200px, quality 0.85
completed: boolean
order: number               // display order in grid
size: 'small' | 'large'
createdAt: string
```

#### Interactions
- **Tap cell** → bottom sheet with details (description editable, deadline, "Mark complete" button)
- **Tap + cell** → add form (title, emoji, description, deadline, photo upload)
- **Photo upload:** compressed client-side via canvas (max 1200px, JPEG 85%) before storing as base64 in Firebase
- **Edit mode** (Ред. button in header):
  - Drag & drop to reorder cells
  - ✕ button to delete goal
  - ⊞/⊟ button to toggle cell size (small ↔ large)

#### Footer
- Progress bar + "Целей: N" + "Выполнено: M"

### 5. Sport Tracker

**Location:** `twa/src/components/SportsBoard.jsx`

Firebase-backed sport tracking tab with categories, exercises, and workout logs.

#### Categories

- Each category has a name, emoji (from 12 presets), and auto-assigned color (from 6-color palette)
- **Create:** tap "+ Добавить категорию" tile at the bottom of the list → `AddCatSheet` opens
- **Edit:** tap "редактировать" next to the category name → same `AddCatSheet` opens pre-filled; button reads "Сохранить изменения"
- Category label row shows: `[emoji name]  [+ добавить]  [редактировать]`

#### Category Data Structure (Firebase: `users/shared_user/sport_categories/{id}`)
```
id: string
name: string        // max 30 chars
emoji: string       // one of CAT_EMOJIS
color: string       // hex from CAT_COLORS palette
```

#### Exercises

- Each exercise belongs to a category and has a type that determines how results are tracked
- **Types:** `reps` (repetitions), `weight` (kg), `both` (weight + reps), `time` (minutes)
- **Create:** tap "+ добавить" next to category name or "+ Упражнение" header button
- **Edit:** tap "Изменить" inside exercise detail sheet
- **Delete:** tap "Удалить упражнение" inside exercise detail sheet

#### Exercise Data Structure (Firebase: `users/shared_user/sport_exercises/{id}`)
```
id: string
catId: string       // references category id
name: string        // max 40 chars
type: 'reps' | 'weight' | 'both' | 'time'
unit: string        // e.g. 'повт.', 'кг', 'мин'
logs: {
  {timestamp}: {
    date: "YYYY-MM-DD"
    val: number       // reps, weight, or time
    val2: number|null // reps count when type='both'
    sets: number      // 1–20
    note: string      // max 100 chars
  }
}
```

#### Interactions
- **Tap exercise card** → detail sheet with record, streak, sessions, delta, SVG line chart, log history
- **"+ Внести результат"** → `AddResultSheet` with numeric pickers (± buttons) and PR detection
- **Tab bar** (Все / per-category) → filters exercise list
- **Search** → real-time filtering by exercise name

#### App.jsx Functions
- `addSportCat(cat)` — write new category to Firebase
- `deleteSportCat(id)` — remove category from Firebase
- `updateSportCat(id, changes)` — update category name/emoji in Firebase
- `addSportEx(ex)` — write new exercise
- `updateSportEx(id, changes)` — update exercise fields
- `deleteSportEx(id)` — remove exercise
- `addSportLog(exId, logEntry)` — append workout result

### 6. Day-Change Detection

Runs on app mount and every 60 seconds:
- Compares stored date (`localStorage.twa_last_date`) with current date
- If dates differ: marks all incomplete tasks as `carriedOver: true` (displayed in red)
- Resets `completedToday` counter to 0

### 7. Progress Bars

**Location:** `twa/src/components/DateBlock.jsx`

- **Year Progress:** Days elapsed / days in year (accounts for leap years)
- **Day Progress:** Tasks completed today / total tasks started today
- Formatted as "Пятница, 27 февраля" (Russian localization)

### 8. Telegram Bot Integration

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
- `OPENAI_API_KEY` — OpenAI API key *(required for voice transcription, currently disabled)*

**To enable voice transcription:** add `OPENAI_API_KEY` to Vercel env vars and `.env`, then uncomment all `# [VOICE]` blocks in `twa/api/webhook.py` and `bot.py`.

### 9. Firebase Realtime Sync

**Location:** `twa/src/firebase.js`

- Real-time listeners on tasks, completed counter, goals, sport categories, and sport exercises
- Data structure:
  ```
  users/
    shared_user/
      tasks/
        {id}: { id, text, createdAt, carriedOver, deadline? }
      completedToday: {number}
      goals/
        {id}: { id, title, emoji, description, deadline, imageBase64, completed, order, size, createdAt }
      sport_categories/
        {id}: { id, name, emoji, color }
      sport_exercises/
        {id}: { id, catId, name, type, unit, logs: { {ts}: { date, val, val2, sets, note } } }
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

- **Shared Data:** All authenticated users see and modify the same tasks, goals, and sport data. To switch to per-user data, change `userId` from `'shared_user'` to the authenticated user's ID.
- **localStorage Keys:**
  - `twa_last_date` — Last app open date (YYYY-MM-DD)
  - `twa_browser_id` — User-entered Telegram ID (browser only)
- **Telegram SDK:** Loaded synchronously in `index.html` before any other scripts. Optional chaining (`?.`) guards against missing SDK in plain browser mode.
- **Goals photos:** Stored as base64 in Firebase (no external storage). Compressed to 1200px JPEG 85% ≈ 100–300KB per photo.

## File Ownership

- **Local bot** (`bot.py`, `requirements.txt`, `.env`) — Local polling mode. Not deployed to Vercel.
- **Vercel webhook** (`twa/api/webhook.py`, `twa/api/requirements.txt`) — Production bot handler. Deployed automatically with the TWA.
- **TWA files** (`twa/src/`) — Main focus. All auth/task/goal/sync logic lives here.

## Recent Changes

- Added access control system with whitelist authentication
- Created auth gate in App.jsx with Telegram Mini App + browser modes
- Added AccessDenied and BrowserLogin components
- Added local Python bot (`bot.py`) with Firebase Admin SDK integration
- Added Vercel Serverless webhook (`twa/api/webhook.py`) for production bot
- Added inline task editing: double-click on task text to edit, Enter/blur to save, Escape to cancel
- Added dismiss button (✕) on each task: removes task without counting toward day progress
- Added deadline support: date + time picker, background color urgency, year limited to 4 digits
- Deadline pickers appear on input focus, hide on outside click
- Voice transcription via OpenAI Whisper prepared — currently **disabled**, pending `OPENAI_API_KEY`
- Added bottom tab bar: Tasks / Goals / Routine (icons only, active icon scales up)
- Added Goals tab: Vision Board mosaic grid with photo cells
- Goals: tap → detail sheet, + → add form, Edit mode → drag/drop/delete/resize
- Goals photo stored as base64 (1200px, JPEG 85%) in Firebase
- Added Sport tab: Firebase-backed tracker with categories, exercises, logs, charts
- Sport categories: create, edit (name + emoji), delete
- Sport exercises: create, edit, delete, log results with numeric pickers
- Sport detail sheet: record, streak, sessions, delta, SVG line chart, log history

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

- Implement Routine tab
- Switch from shared data to per-user data (change `userId` logic)
- Add user profile display with Telegram avatar/name
- Move whitelist to Firebase for dynamic management

---

**Last Updated:** 2026-03-19 (Sport tab + category editing)
