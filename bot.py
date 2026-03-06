import os
import logging
from datetime import datetime, timezone

from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters, ContextTypes

# ── Load environment ───────────────────────────────────────────────────────────
load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "./serviceAccount.json")

# ── Whitelist (mirrors twa/src/auth.js ALLOWED_IDS) ──────────────────────────
ALLOWED_IDS = {'668356521'}

# ── Firebase Admin SDK initialization ────────────────────────────────────────
cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
firebase_admin.initialize_app(cred, {
    'databaseURL': 'https://telegram-task-app-2888d-default-rtdb.asia-southeast1.firebasedatabase.app'
})

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)


def write_task_to_firebase(text: str) -> str:
    task_id = str(int(datetime.now(timezone.utc).timestamp() * 1000))
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    task_data = {
        'id': task_id,
        'text': text,
        'createdAt': today,
        'carriedOver': False
    }

    db.reference(f'users/shared_user/tasks/{task_id}').set(task_data)
    logger.info(f"Task written: {task_id} — '{text}'")
    return task_id


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = str(update.effective_user.id)

    if user_id not in ALLOWED_IDS:
        await update.message.reply_text("⛔ У вас нет доступа к этому боту.")
        return

    name = update.effective_user.first_name or "друг"
    await update.message.reply_text(
        f"Привет, {name}! 👋\n\n"
        "Отправь мне любое сообщение, и я добавлю его как задачу в список дел.\n\n"
        "Задачи появятся в приложении в реальном времени."
    )


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user_id = str(update.effective_user.id)

    if user_id not in ALLOWED_IDS:
        await update.message.reply_text("⛔ У вас нет доступа к этому боту.")
        logger.warning(f"Unauthorized access attempt by user ID: {user_id}")
        return

    text = update.message.text.strip()
    if not text:
        return

    try:
        task_id = write_task_to_firebase(text)
        await update.message.reply_text("✅ Задача добавлена!")
        logger.info(f"User {user_id} added task {task_id}: '{text}'")
    except Exception as e:
        logger.error(f"Firebase write failed: {e}")
        await update.message.reply_text("❌ Ошибка при добавлении задачи. Попробуй снова.")


def main() -> None:
    if not BOT_TOKEN or BOT_TOKEN == "your_telegram_bot_token_here":
        raise ValueError("BOT_TOKEN не задан в .env файле")

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    logger.info("Bot started. Polling...")
    app.run_polling()


if __name__ == '__main__':
    main()
