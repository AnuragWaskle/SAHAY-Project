import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPhoneNumber, RecaptchaVerifier, onAuthStateChanged, signOut, User } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "dummy_api_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy_project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "00000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000:web:0000000"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Keep this flexible so we can inject Recaptcha UI dynamically
export const setupRecaptcha = (containerId: string) => {
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
};

export { signInWithPhoneNumber, onAuthStateChanged, signOut };
export type { User };
