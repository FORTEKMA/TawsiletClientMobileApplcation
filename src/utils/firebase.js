import { initializeApp } from 'firebase/app';
import {getFirestore} from '@react-native-firebase/firestore';
import { getDatabase } from 'firebase/database';
import {
  IN_DEV,
  FIREBASE_DB_URL_DEV,
  FIREBASE_DB_URL_DEFAULT
} from '@env';

const firebaseConfig = {
  projectId: "tawsiletdriver",
  apiKey: "AIzaSyAYr_x26klMsgyG3W1eeJUIiA-JC1Ol-tU",
  authDomain: "tawsiletdriver.firebaseapp.com",
  databaseURL: IN_DEV=="true" ? FIREBASE_DB_URL_DEV : FIREBASE_DB_URL_DEFAULT,
  storageBucket: "tawsiletdriver.firebasestorage.app",
  messagingSenderId: "960462603456",
  appId: "1:960462603456:android:5ce15b5635b15eec5bd925"
};

const firebaseApp = initializeApp(firebaseConfig);

// Initialize Firestore with different database instances based on environment
const firestoreDb =getFirestore(firebaseApp,IN_DEV === "true"?"devdb":"(default)");

 

// Initialize Realtime Database
const realtimeDb = getDatabase(firebaseApp);

export { firestoreDb, realtimeDb };