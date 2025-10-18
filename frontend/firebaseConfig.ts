// frontend/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDDf6W5Pojq3lk0uZQX33dwaQ00jVKFkLQ",
  authDomain: "quickly-7e851.firebaseapp.com",
  projectId: "quickly-7e851",
  storageBucket: "quickly-7e851.appspot.com", // <-- fixed typo here
  messagingSenderId: "933522193771",
  appId: "1:933522193771:web:e78ee6f4494d396524a02e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Export this
export const auth = getAuth(app);
