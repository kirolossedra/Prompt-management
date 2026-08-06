import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const suppliedConfig = {
  apiKey: "AIzaSyAYr824z_XxqfxNiIr4y7gmbd23Tc84h1s",
  authDomain: "engineering-861d3.firebaseapp.com",
  databaseURL: "https://engineering-861d3-default-rtdb.firebaseio.com/",
  projectId: "engineering-861d3",
  storageBucket: "engineering-861d3.firebasestorage.app",
  messagingSenderId: "119129277466",
  appId: "1:119129277466:web:2457e5ea8abccf706e3da3",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || suppliedConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || suppliedConfig.authDomain,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || suppliedConfig.databaseURL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || suppliedConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || suppliedConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || suppliedConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || suppliedConfig.appId,
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const database = getDatabase(firebaseApp);

void setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Unable to enable persistent authentication", error);
});

export const VAULT_ROOT = "intellectVault/users";
