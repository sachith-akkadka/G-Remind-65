// lib/firebase.ts

// Step 1: Import the v9 modular functions
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAUrp8hpxKwnvbjqgaW7zA97xFwXsA7grc",
  authDomain: "g-remind-a20fa.firebaseapp.com",
  projectId: "g-remind-a20fa",
  storageBucket: "g-remind-a20fa.firebasestorage.app",
  messagingSenderId: "1008254741219",
  appId: "1:1008254741219:web:3451299bf1b0f6576ab3d6",
  measurementId: "G-E0NNXYB83Q"
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
