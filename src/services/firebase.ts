import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDCyZX1BlQXRnQ92xf-s-fHlMrsG4Dxmng",
  authDomain: "cellular-unity-440317-d2.firebaseapp.com",
  projectId: "cellular-unity-440317-d2",
  storageBucket: "cellular-unity-440317-d2.firebasestorage.app",
  messagingSenderId: "611379941787",
  appId: "1:611379941787:web:e19e37c1301df8f699d13e",
  measurementId: "G-DL9LGM6YB4"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);