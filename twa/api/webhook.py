import os
import json
import base64
import tempfile
import urllib.request
import urllib.parse
import urllib.error
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

import firebase_admin
from firebase_admin import credentials, db

ALLOWED_IDS = {'668356521'}

INIT_ERROR = None
try:
    if not firebase_admin._apps:
        cred_json = {
            "type": "service_account",
            "project_id": os.environ['FB_PROJECT_ID'],
            "private_key_id": os.environ['FB_PRIVATE_KEY_ID'],
            "private_key": base64.b64decode(os.environ['FB_PRIVATE_KEY']).decode('utf-8'),
            "client_email": os.environ['FB_CLIENT_EMAIL'],
            "client_id": os.environ['FB_CLIENT_ID'],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": os.environ['FB_CLIENT_CERT_URL'],
            "universe_domain": "googleapis.com"
        }
        cred = credentials.Certificate(cred_json)
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://telegram-task-app-2888d-default-rtdb.asia-southeast1.firebasedatabase.app'
        })
except Exception as e:
    INIT_ERROR = str(e)


def transcribe_voice(file_id):
    bot_token = os.environ.get('BOT_TOKEN', '')
    openai_key = os.environ.get('OPENAI_API_KEY', '')
    if not openai_key:
        return None

    # 1. Получить путь к файлу
    get_file_url = f'https://api.telegram.org/bot{bot_token}/getFile?file_id={file_id}'
    with urllib.request.urlopen(get_file_url) as resp:
        file_info = json.loads(resp.read())
    file_path = file_info['result']['file_path']

    # 2. Скачать аудио файл
    audio_url = f'https://api.telegram.org/file/bot{bot_token}/{file_path}'
    with urllib.request.urlopen(audio_url) as resp:
        audio_data = resp.read()

    # 3. Отправить в OpenAI Whisper через multipart/form-data
    boundary = b'----WhisperBoundary'
    body = (
        b'--' + boundary + b'\r\n'
        b'Content-Disposition: form-data; name="model"\r\n\r\n'
        b'whisper-1\r\n'
        b'--' + boundary + b'\r\n'
        b'Content-Disposition: form-data; name="language"\r\n\r\n'
        b'ru\r\n'
        b'--' + boundary + b'\r\n'
        b'Content-Disposition: form-data; name="file"; filename="voice.ogg"\r\n'
        b'Content-Type: audio/ogg\r\n\r\n'
        + audio_data + b'\r\n'
        b'--' + boundary + b'--\r\n'
    )

    req = urllib.request.Request(
        'https://api.openai.com/v1/audio/transcriptions',
        data=body,
        headers={
            'Authorization': f'Bearer {openai_key}',
            'Content-Type': f'multipart/form-data; boundary={boundary.decode()}'
        },
        method='POST'
    )
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    return result.get('text', '').strip() or None


def write_task(text):
    task_id = str(int(datetime.now(timezone.utc).timestamp() * 1000))
    db.reference(f'users/shared_user/tasks/{task_id}').set({
        'id': task_id,
        'text': text,
        'createdAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        'carriedOver': False
    })


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if INIT_ERROR:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f'Firebase init error: {INIT_ERROR}'.encode())
            return

        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length))

        message = body.get('message', {})
        user_id = str(message.get('from', {}).get('id', ''))

        if user_id not in ALLOWED_IDS:
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'ok')
            return

        # Текстовое сообщение
        text = message.get('text', '').strip()
        if text and not text.startswith('/'):
            write_task(text)

        # Голосовое сообщение
        voice = message.get('voice')
        if voice:
            try:
                transcribed = transcribe_voice(voice['file_id'])
                if transcribed:
                    write_task(transcribed)
            except Exception:
                pass

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def do_GET(self):
        if INIT_ERROR:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f'Firebase init error: {INIT_ERROR}'.encode())
            return

        # Регистрация webhook: /api/webhook?setup=1
        if 'setup=1' in (self.path.split('?')[1] if '?' in self.path else ''):
            token = os.environ.get('BOT_TOKEN', '')
            webhook_url = 'https://telegram-to-do-mini-app.vercel.app/api/webhook'
            api_url = f'https://api.telegram.org/bot{token}/setWebhook?url={webhook_url}'
            with urllib.request.urlopen(api_url) as resp:
                result = resp.read()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(result)
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'webhook ok')
