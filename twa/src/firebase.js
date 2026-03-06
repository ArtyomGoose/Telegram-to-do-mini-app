import { initializeApp } from 'firebase/app'
import { getDatabase, ref, onValue, set, remove, update } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyC0DKhW_8j_HWUq_qwPcBg0UCM2TElLY_M',
  authDomain: 'telegram-task-app-2888d.firebaseapp.com',
  databaseURL: 'https://telegram-task-app-2888d-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'telegram-task-app-2888d',
  storageBucket: 'telegram-task-app-2888d.firebasestorage.app',
  messagingSenderId: '44139404972',
  appId: '1:44139404972:web:595de0c87049a972e00909'
}

const app = initializeApp(firebaseConfig)
const database = getDatabase(app)

export { database, ref, onValue, set, remove, update }
