import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA7O3Dh0ytHUJwF2TAYuBl83RBrhDqKUNc",
  authDomain: "attendance-page-5e45c.firebaseapp.com",
  projectId: "attendance-page-5e45c",
  storageBucket: "attendance-page-5e45c.appspot.com",
  messagingSenderId: "931015390628",
  appId: "1:931015390628:web:b244fcb9be565c818abd31"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

// Function to Sign In with Google
const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("User signed in:", result.user);
    return result.user;
  } catch (error) {
    console.error("Error signing in:", error);
  }
};

// Function to Sign Out
const logout = async () => {
  try {
    await signOut(auth);
    console.log("User signed out");
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

// Function to Store Form Data
const saveForm = async (userId, formData) => {
  try {
    const docRef = await addDoc(collection(db, "forms"), {
      userId,
      ...formData,
      createdAt: new Date(),
    });
    console.log("Form saved with ID:", docRef.id);
  } catch (error) {
    console.error("Error saving form:", error);
  }
};

// Function to Fetch Forms for a User
const getFormsByUser = async (userId) => {
  const q = query(collection(db, "forms"), where("userId", "==", userId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

export { auth, provider, db, signInWithGoogle, logout, saveForm, getFormsByUser };
