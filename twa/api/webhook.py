import os
import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

import firebase_admin
from firebase_admin import credentials, db

ALLOWED_IDS = {'668356521'}

if not firebase_admin._apps:
    cred_json = json.loads(os.environ['FIREBASE_CREDENTIALS_JSON'])
    cred = credentials.Certificate(cred_json)
    firebase_admin.initialize_app(cred, {
        'databaseURL': 'https://telegram-task-app-2888d-default-rtdb.asia-southeast1.firebasedatabase.app'
    })


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
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
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'webhook ok')
