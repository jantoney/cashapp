// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {  
  apiKey: "AIzaSyCmA-FEdlF7cGAFRWRbD-4N8vPHHcDjhiU",  
  authDomain: "cashapp-857f2.firebaseapp.com",  
  projectId: "cashapp-857f2",  
  storageBucket: "cashapp-857f2.firebasestorage.app",  
  messagingSenderId: "749626774042",  
  appId: "1:749626774042:web:4533041621a8d5337477a3"  
};  

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const fsDocRef = doc(db, "appData", "transactions"); // single document for transactions
const fsCategoriesDocRef = doc(db, "appData", "categories"); // document for categories

export { app, db, auth, fsDocRef, fsCategoriesDocRef, onSnapshot, setDoc, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup };
