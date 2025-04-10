import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, db } from "../firebaseConfig";
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
const Home = () => {
  const [user, setUser] = useState(null);
  const [forms, setForms] = useState([]);
  const navigate = useNavigate();

  // Function to handle Google Login
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      localStorage.setItem("user", JSON.stringify(result.user)); // Store login session
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Function to handle Logout
  const handleLogout = () => {
    signOut(auth);
    setUser(null);
    localStorage.removeItem("user");
  };

  // Fetch forms created by logged-in user
  useEffect(() => {
    const fetchForms = async () => {
      if (user) {
        const q = query(collection(db, "forms"), where("creator", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const fetchedForms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setForms(fetchedForms);
      }
    };

    fetchForms();
  }, [user]);

  // Restore session if user was logged in before
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <div className="w-screen min-h-screen flex flex-col items-center pt-8 pb-8 overflow-y-auto bg-gray-100">
      <h1 className="text-3xl font-bold mb-5">📜Avish Forms</h1>

      {user ? (
        <>
          <p className="mb-4 text-lg">Welcome, {user.displayName}!</p>
          <button className="bg-red-500 text-black px-4 py-2 rounded mb-5  cursor-pointer" onClick={handleLogout}>
            Logout
          </button>

          <button
            className="bg-blue-500 text-white px-4 py-2 rounded mb-5 cursor-pointer"
            onClick={() => navigate("/create")}
          >
            ➕ Create New Form
          </button>

          <h2 className="text-2xl font-semibold mb-3">Your Forms</h2>
          {forms.length === 0 ? (
            <p>No forms created yet.</p>
          ) : (
            <ul className=" bg-white shadow-lg rounded p-4">
              {forms.map((form) => (
                <li key={form.id} className="flex justify-between items-center p-2 border-b">
                  <span className="text-lg">{form.title}</span>
                  <div>
                    <button
                      className="bg-green-500 text-white px-3 py-1 rounded mr-2 active:bg-green-700 active:scale-95 transition-all duration-200 cursor-pointer"
                      onClick={() => navigate(`/admin/${form.id}`)}
                    >
                      View Responses
                    </button>
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded active:bg-blue-700 active:scale-95 transition-all duration-200 cursor-pointer"
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/fill/${form.id}`)}
                    >
                      Copy Link
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <button className="bg-blue-500 text-black px-4 py-2 rounded cursor-pointer" onClick={handleLogin}>
          Login with Google
        </button>
      )}
    </div>
  );
};

export default Home;
