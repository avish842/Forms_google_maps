import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, provider, db } from "../firebaseConfig";
import { signInWithPopup, signOut } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";

const Home = () => {
  const [user, setUser] = useState(null);
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Function to handle Google Login
  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      localStorage.setItem("user", JSON.stringify(result.user));
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
        setLoading(true);
        try {
          const q = query(collection(db, "forms"), where("creator", "==", user.uid));
          const querySnapshot = await getDocs(q);
          const fetchedForms = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Sort forms by createdAt date in descending order (newest first)
          const sortedForms = fetchedForms.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : a.createdAt?.toDate();
            const dateB = b.createdAt instanceof Date ? b.createdAt : b.createdAt?.toDate();
            
            if (!dateA) return 1;
            if (!dateB) return -1;
            
            return dateB - dateA;
          });
          
          setForms(sortedForms);
        } catch (error) {
          console.error("Error fetching forms:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchForms();
  }, [user]);

  // Restore session if user was logged in before
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      setLoading(false);
    }
  }, []);

  // Copy form link and show feedback
  const copyFormLink = (formId) => {
    const link = `${window.location.origin}/fill/${formId}`;
    navigator.clipboard.writeText(link);
    
    // Show copy feedback (you could use a toast notification library here)
    const element = document.getElementById(`copy-${formId}`);
    if (element) {
      element.innerText = "Copied!";
      setTimeout(() => {
        element.innerText = "Copy Link";
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-md py-4 px-4 sm:px-6">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-700 flex items-center">
            <img src="/logo.svg" alt="AvishForms Logo" className="h-10 w-10 mr-3" />
            <span className="bg-gradient-to-r from-indigo-600 to-blue-500 bg-clip-text text-transparent">
              AvishForms 
            </span>
            <span className="text-xs text-gray-500 ml-[5px] mt-[20px]">By NITian</span>
          </h1>
          
          {user && (
            <div className="flex items-center">
              <div className="hidden sm:flex items-center mr-4">
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="h-8 w-8 rounded-full border-2 border-indigo-200"
                />
                <span className="ml-2 text-gray-700 text-sm font-medium hidden sm:inline">
                  {user.displayName}
                </span>
              </div>
              <button 
                onClick={handleLogout}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 sm:px-4 py-1 sm:py-2 text-sm rounded-lg transition-all duration-200 border border-indigo-200"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[70vh]">
            <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full text-center transform hover:scale-105 transition-transform duration-300">
              <div className="mb-8">
                <img src="/logo.svg" alt="FormBuilder Logo" className="w-24 h-24 mx-auto" />
              </div>
              
              <h2 className="text-2xl font-bold mb-2 text-gray-800">Welcome to AvishForms</h2>
              <span className="text-xs text-gray-700 ml-[5px] font-bold" >(By NITian)</span>
              <p className="text-gray-600 mb-6">Create custom forms, collect responses, and analyze data with ease.</p>
              
              <button 
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-700 hover:to-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                onClick={handleLogin}
              >
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg" className="mr-2">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
                  </g>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Your Forms</h2>
                <p className="text-gray-600">Create, manage, and analyze your forms</p>
              </div>
              
              <button
                onClick={() => navigate("/create")}
                className="mt-4 md:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-6 rounded-lg transition duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                New Form
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : forms.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-800">No forms yet</h3>
                <p className="text-gray-600 mb-6">Create your first form to get started</p>
                <button
                  onClick={() => navigate("/create")}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  Create Form
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {forms.map((form) => (
                  <div 
                    key={form.id}
                    className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden border border-gray-100"
                  >
                    <div className="p-5 bg-indigo-50 border-b border-gray-100">
                      <h3 className="font-semibold text-lg text-gray-800 truncate" title={form.title}>
                        {form.title}
                      </h3>
                      <div className="flex items-center text-sm text-gray-500 mt-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {form.createdAt ? new Date(
                            form.createdAt.seconds ? form.createdAt.seconds * 1000 : form.createdAt
                          ).toLocaleDateString() : 'Date unknown'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-5">
                      <div className="text-sm text-gray-600 mb-4">
                        <span className="font-medium">{form.fields?.length || 0} fields</span>
                      </div>
                      
                      <div className="flex flex-col space-y-2">
                        <button
                          onClick={() => navigate(`/admin/${form.id}`)}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded-md transition-colors duration-150 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                          View Responses
                        </button>
                        
                        <button
                          id={`copy-${form.id}`}
                          onClick={() => copyFormLink(form.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition-colors duration-150 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                            <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                          </svg>
                          Copy Link
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-6 mt-12">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} FormBuilder. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
