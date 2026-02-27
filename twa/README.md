# Telegram Mini App (TWA) - Task Tracker

A mobile-first React + Vite web application designed as a Telegram Mini App for tracking daily tasks with year/day progress visualization.

## Quick Start

```bash
cd twa
npm install
npm run dev           # → http://localhost:5173
```

## Build & Deploy

```bash
npm run build         # Creates dist/ folder
npm run preview       # Local preview
```

Deploy `dist/` to an HTTPS server and register the URL in BotFather as a Telegram Mini App.

## Features

### 📅 Day & Year Progress
- **Russian date display**: Format like "Пятница, 27 февраля"
- **Year progress bar**: Shows day 58/365 ≈ 15.9% (including leap year detection)
- **Day progress bar**: Task completion ratio for today

### ✅ Task Management
- Add tasks with a simple input + button interface
- Complete tasks with a checkmark button
- Press Enter to quickly add tasks
- All data persists in `localStorage`

### 🌙 Day-Change Detection
- When the date changes, existing tasks are marked as "carried over" (red text)
- Today's completion counter resets to 0
- Real-time check every 60 seconds catches overnight transitions

### 🎨 Dark Telegram Theme
- Automatically adapts to Telegram's native color scheme
- Gradient progress bars: Year (blue) and Day (green)
- 480px max-width, centered layout
- Mobile-optimized UI

## localStorage Keys

- `twa_tasks` — JSON array of task objects
- `twa_last_date` — "YYYY-MM-DD" string of last app open
- `twa_completed_today` — Integer string, count of completed tasks

## Task Data Model

```json
{
  "id": 1740652800000,
  "text": "Task description",
  "createdAt": "2026-02-27",
  "carriedOver": false
}
```

## Testing

### Fresh Start
- Open app with empty `localStorage`
- Should show year progress ~15.9%
- Add tasks and watch day progress increase

### Day-Change Simulation
```javascript
localStorage.setItem('twa_last_date', '2026-02-25');
location.reload();
```
All tasks will turn red and mark as carried over.

### In Telegram
1. Deploy `dist/` to HTTPS server
2. Set URL in BotFather
3. Open mini app in Telegram
4. Check that theme matches Telegram's dark mode

## File Structure

```
src/
├── main.jsx              # Telegram SDK initialization
├── App.jsx               # State, localStorage, day-change logic
├── App.css               # Dark Telegram theme styles
├── index.css             # Base styles
└── components/
    ├── DateBlock.jsx     # Russian dates, progress bars
    └── TaskList.jsx      # Task input, list, complete buttons
```

## Browser Compatibility

- Works in plain browser (optional chaining guards Telegram SDK)
- Fully compatible with Telegram's Web App environment
- Supports mobile and desktop browsers
