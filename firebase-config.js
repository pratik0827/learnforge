// ============================================================
// LEARN FORGE — Firebase Configuration
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCT-Kga6nCvqUP-uPYTsw99aMcH1edkhhQ",
  authDomain: "learnforge-73e6e.firebaseapp.com",
  projectId: "learnforge-73e6e",
  storageBucket: "learnforge-73e6e.firebasestorage.app",
  messagingSenderId: "1009547052669",
  appId: "1:1009547052669:web:b1470cf3438db7ec841314",
  measurementId: "G-0C91TYQDGM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

