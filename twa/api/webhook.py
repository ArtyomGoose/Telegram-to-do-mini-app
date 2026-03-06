import os
import json
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
            "private_key": os.environ['FB_PRIVATE_KEY'].replace('\\n', '\n'),
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
        text = message.get('text', '').strip()

        if user_id in ALLOWED_IDS and text and not text.startswith('/'):
            task_id = str(int(datetime.now(timezone.utc).timestamp() * 1000))
            db.reference(f'users/shared_user/tasks/{task_id}').set({
                'id': task_id,
                'text': text,
                'createdAt': datetime.now(timezone.utc).strftime('%Y-%m-%d'),
                'carriedOver': False
            })

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'ok')

    def do_GET(self):
        if INIT_ERROR:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(f'Firebase init error: {INIT_ERROR}'.encode())
            return

        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'webhook ok')
