import { auth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from './firebase-config.js';
import { showToast } from './utils.js';
import { loadFromFirestore } from './transactions.js';

function initializeAuth() {
  const loginContainer = document.getElementById('loginContainer');
  const appContainer = document.getElementById('appContainer');
  
  // Auth state listener
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, show the app
      loginContainer.style.display = 'none';
      appContainer.style.display = 'block';
      loadFromFirestore();
    } else {
      // No user is signed in, show login form
      appContainer.style.display = 'none';
      loginContainer.style.display = 'block';
    }
  });

  // Login
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      showToast("Login failed: " + err.message);
    }
  });
  
  // Sign up
  document.getElementById('signupBtn').addEventListener('click', async () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      showToast("Sign up failed: " + err.message);
    }
  });
  
  // Sign out
  document.getElementById('signOutBtn').addEventListener('click', async () => {
    try {
      await signOut(auth);
      showToast("Signed out successfully");
    } catch (err) {
      console.error(err);
      showToast("Sign out failed: " + err.message);
    }
  });

  // Google Sign-In
  document.getElementById('googleSignInBtn').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
      showToast("Google sign in failed: " + err.message);
    }
  });
}

export { initializeAuth };
