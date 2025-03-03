import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../firebaseConfig";

const Auth = ({ onLogin }) => {
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      localStorage.setItem("user", JSON.stringify(result.user));
      onLogin(result.user);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <button
        onClick={handleLogin}
        className="px-4 py-2 bg-blue-500 text-black rounded-lg"
      >
        Login with Google
      </button>
    </div>
  );
};

export default Auth;
