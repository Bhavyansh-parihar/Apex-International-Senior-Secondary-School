/* ============================================
   FIREBASE CONFIGURATION
   Apex International School — Admin Portal
   Using Firebase Compat SDK (works in plain HTML)
   ============================================ */

const firebaseConfig = {
    apiKey: "AIzaSyC-40yja6AZW4ZnYvr5xKZ3MHVt6NgNkdY",
    authDomain: "apex-international-schoo-b6d46.firebaseapp.com",
    projectId: "apex-international-schoo-b6d46",
    storageBucket: "apex-international-schoo-b6d46.firebasestorage.app",
    messagingSenderId: "396691111307",
    appId: "1:396691111307:web:ed30f99005afb12f92c38e",
    measurementId: "G-48Q6KG4Y7V"
};

// Guard: only initialise once (safe if script loaded multiple times)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Global references used throughout admin-data.js
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();   // Firebase Authentication

console.log('🔥 Firebase ready — project:', firebaseConfig.projectId);
