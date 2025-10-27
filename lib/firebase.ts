// lib/firebase.ts

// Step 1: Import the v9 modular functions
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
apiKey: "AIzaSyAzZPPPiwhmNjxfXOJU-Mx120O5H-DVxRg",
  authDomain: "g-remind-90d67.firebaseapp.com",
  projectId: "g-remind-90d67",
  storageBucket: "g-remind-90d67.firebasestorage.app",
  messagingSenderId: "22924274549",
  appId: "1:22924274549:web:611d86fcc42d6c2026c13c"
};

// Step 2: Initialize Firebase
// We add a check to prevent re-initializing the app on hot reloads.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Step 3: Get references to the services you need
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Step 4: Export the services
export { app, auth, db, storage };