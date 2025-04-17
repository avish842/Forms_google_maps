import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import Auth from "../components/Auth";
import { useDrawingContext } from "../map_comp/context/DrawingContext";
import MapsCompFill from "../map_comp/MapsCompFill";

const FillForm = () => {
  const { formId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isWithinArea, setIsWithinArea] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const { userLocation } = useDrawingContext();
  const [isDomainAllowed, setIsDomainAllowed] = useState(true);

  useEffect(() => {
    if (!formId) {
      console.error("❌ No formId provided!");
      return;
    }

    const fetchForm = async () => {
      try {
        console.log("🔍 Fetching form by 'id' field:", formId);

        // Query Firestore where "id" field matches formId
        const q = query(collection(db, "forms"), where("id", "==", formId));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const formData = querySnapshot.docs[0].data();
          console.log("✅ Form found:", formData);
          
          // Check if form is closed or inactive immediately
          if (formData.closed === true || formData.active === false) {
            console.log("Form is closed or inactive, not allowing submissions");
            // Still set the form data so we can show the form info in the disabled message
            setForm(formData);
            return;
          }
          
          setForm(formData);
          
          // Initialize responses object with empty values
          const initialResponses = {};
          formData.fields.forEach(field => {
            if (field.type === "checkbox") {
              initialResponses[field.id] = [];
            } else {
              initialResponses[field.id] = "";
            }
          });
          setResponses(initialResponses);
          
          // Check if form has location restrictions
          if (formData.requiresLocation) {
            // We'll check location later when we have both form data and user location
            console.log("This form has location restrictions.");
          } else {
            // No location restrictions
            setIsWithinArea(true);
          }
        } else {
          console.error("❌ No form found with id:", formId);
        }
      } catch (error) {
        console.error("❌ Error fetching form:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchForm();
  }, [formId]);

  // Check if user is within the allowed area whenever user location or form data changes
  useEffect(() => {
    if (form?.requiresLocation && form?.locationRestriction && userLocation) {
      checkIfUserIsInArea(userLocation, form.locationRestriction);
    }
  }, [form, userLocation]);

  // Function to check if user is within the defined area
  const checkIfUserIsInArea = (userLocation, locationRestriction) => {
    try {
      const { type, coordinates } = locationRestriction;
      let isInArea = false;
      
      if (type === 'circle') {
        // Check if user is within circle
        const { center, radius } = coordinates;
        const distance = calculateDistance(
          userLocation.lat, 
          userLocation.lng, 
          center.lat, 
          center.lng
        );
        isInArea = distance <= radius;
      } else if (type === 'rectangle') {
        // Check if user is within rectangle
        const { bounds } = coordinates;
        isInArea = userLocation.lat >= bounds.south && 
                   userLocation.lat <= bounds.north && 
                   userLocation.lng >= bounds.west && 
                   userLocation.lng <= bounds.east;
      } else if (type === 'polygon') {
        // Check if point is inside polygon (ray casting algorithm)
        isInArea = isPointInPolygon(userLocation, coordinates.path);
      }
      
      setIsWithinArea(isInArea);
      if (!isInArea) {
        console.error("User is not within the allowed area!");
      }
    } catch (error) {
      console.error("Error checking location:", error);
      setIsWithinArea(false); // Default to false on error
    }
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  };

  // Check if point is in polygon using ray casting algorithm
  const isPointInPolygon = (point, polygon) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat;
      const yi = polygon[i].lng;
      const xj = polygon[j].lat;
      const yj = polygon[j].lng;
      
      const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
          (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  // Check if user's email domain is allowed
  useEffect(() => {
    if (form?.restrictByDomain && user?.email && form.allowedDomains) {
      const emailParts = user.email.split('@');
      if (emailParts.length === 2) {
        const userDomain = emailParts[1].toLowerCase();
        const allowed = form.allowedDomains.some(domain => 
          userDomain === domain.toLowerCase() || 
          userDomain.endsWith('.' + domain.toLowerCase())
        );
        
        setIsDomainAllowed(allowed);
      } else {
        setIsDomainAllowed(false);
      }
    }
  }, [form, user]);

  const handleTextChange = (fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleRadioChange = (fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleCheckboxChange = (fieldId, value, isChecked) => {
    setResponses(prev => {
      const currentSelections = prev[fieldId] || [];
      
      if (isChecked) {
        return {
          ...prev,
          [fieldId]: [...currentSelections, value]
        };
      } else {
        return {
          ...prev,
          [fieldId]: currentSelections.filter(item => item !== value)
        };
      }
    });
  };

  const handleSelectChange = (fieldId, value) => {
    setResponses(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateResponses = () => {
    // Check if all fields have responses
    for (const field of form.fields) {
      const response = responses[field.id];
      
      if (field.type === "checkbox" && response.length === 0) {
        return false;
      } else if ((field.type === "text" || field.type === "radio" || field.type === "select") && 
                (!response || response.trim() === "")) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) {
      alert("Please log in to submit the form.");
      return;
    }

    if (!validateResponses()) {
      alert("Please fill in all fields before submitting.");
      return;
    }
    
    // Check location restrictions
    if (form.requiresLocation && !userLocation) {
      alert("Please enable location access to submit this form.");
      return;
    }
    
    if (form.requiresLocation && !isWithinArea) {
      alert("You must be within the designated area to submit this form.");
      return;
    }

    setSubmitLoading(true);
    try {
      // Save form responses along with user's location if form has location restrictions
      const responseData = {
        formId,
        responses,
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userEmail: user.email, // Explicitly include user's email
        submittedAt: new Date()
      };
      
      // Include location info if the form requires it
      if (form.requiresLocation && userLocation) {
        responseData.userLocation = {
          lat: userLocation.lat,
          lng: userLocation.lng
        };
      }
      
      await addDoc(collection(db, "responses"), responseData);
      setSubmitted(true);
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      alert("Error submitting form. Please try again.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Update the FormDisabledMessage to show the form title
  const FormDisabledMessage = () => (
    <div className="min-h-screen bg-gray-50 p-5">
      <div className="max-w-4xl mx-auto mt-10">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6 bg-red-50 border-b border-red-100">
            <img src="/logo.svg" alt="FormBuilder Logo" className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center text-red-800 mb-2">Form Not Available</h2>
            <p className="text-center text-red-700">
              {form?.title ? `"${form.title}"` : "This form"} is currently not accepting responses.
            </p>
          </div>
          <div className="p-6 bg-white">
            <p className="text-gray-600 mb-6 text-center">
              The form has been closed by the creator. Please contact them for more information.
            </p>
            <div className="flex justify-center">
              <button 
                onClick={() => navigate("/")}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Add a component to display when the user's email domain is not allowed
  const DomainRestrictedMessage = () => (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
      <div className="flex items-center">
        <div className="mr-3 bg-yellow-100 rounded-full p-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div>
          <h3 className="font-medium text-yellow-800">Access Restricted</h3>
          <p className="text-sm text-yellow-700">
            This form is restricted to specific email domains. Your email ({user?.email}) is not from an allowed domain.
          </p>
          <p className="text-sm text-yellow-700 mt-1">
            Allowed domains: {form?.allowedDomains?.map(domain => `@${domain}`).join(', ')}
          </p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }
  
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 p-5">
        <div className="max-w-4xl mx-auto mt-10">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="p-6 bg-green-50 border-b border-green-100">
              <img src="/logo.svg" alt="FormBuilder Logo" className="w-16 h-16 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-center text-green-800 mb-2">Form Submitted Successfully!</h2>
              <p className="text-center text-green-700">Thank you for your response.</p>
            </div>
            <div className="p-6 bg-white">
              <div className="flex justify-center">
                <button 
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    // First check if form is inactive or closed and show message
    if (form && (form.closed === true || form.active === false)) {
      return <FormDisabledMessage />;
    }
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-8 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          {/* Form Header */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden mb-6">
            <div className="p-6 border-b border-gray-200 flex items-center">
              <img src="/logo.svg" alt="FormBuilder Logo" className="h-8 w-8 mr-3" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{form?.title || "Untitled Form"}</h1>
                <p className="text-gray-600 mt-2 text-sm">
                  Please complete all fields below to submit this form
                </p>
              </div>
            </div>
            
            {/* Location notification if applicable */}
            {form?.requiresLocation && (
              <div className={`p-4 border-b ${isWithinArea ? 'bg-green-50' : 'bg-red-50'}`}>
                <div className="flex items-center">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isWithinArea ? 'bg-green-100' : 'bg-red-100'}`}>
                    {isWithinArea ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="ml-4">
                    <p className={`font-semibold ${isWithinArea ? 'text-green-800' : 'text-red-800'}`}>
                      {isWithinArea 
                        ? "You're in the right location!" 
                        : "You must be in the designated area to submit"}
                    </p>
                    <p className={`text-sm ${isWithinArea ? 'text-green-700' : 'text-red-700'}`}>
                      {isWithinArea 
                        ? "Your current location meets the requirements for this form" 
                        : "Please move to the required location before submitting"}
                    </p>
                  </div>
                </div>
                
                {!userLocation && (
                  <div className="mt-3 flex items-center bg-yellow-50 p-3 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-yellow-800 text-sm">
                      Location access is required. Please ensure your device's location services are enabled.
                    </p>
                  </div>
                )}
                
              </div>
            )}

            {/* User info */}
            <div className="bg-gray-50 p-4 border-b">
              <div className="flex items-center">
                {user.photoURL && (
                  <img src={user.photoURL} alt={user.displayName} className="h-8 w-8 rounded-full mr-2" />
                )}
                <div>
                  <p className="text-gray-800 font-medium">{user.displayName}</p>
                  <p className="text-gray-500 text-sm">{user.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Domain restriction warning if applicable */}
          {form?.restrictByDomain && !isDomainAllowed && <DomainRestrictedMessage />}

          {/* Form Fields */}
          <div className="space-y-6">
            {form?.fields?.map((field) => (
              <div key={field.id} className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="p-6">
                  <label className="block text-lg font-medium text-gray-800 mb-3">
                    {field.question}
                  </label>
                  
                  {field.type === "text" && (
                    <input
                      type="text"
                      value={responses[field.id] || ""}
                      onChange={(e) => handleTextChange(field.id, e.target.value)}
                      placeholder="Your answer"
                      className="border border-gray-300 p-3 w-full rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                  )}
                  
                  {field.type === "radio" && field.options && field.options.length > 0 && (
                    <div className="ml-2 space-y-3">
                      {field.options.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <input
                            type="radio"
                            id={`${field.id}-${option.id}`}
                            name={field.id}
                            value={option.value}
                            checked={responses[field.id] === option.value}
                            onChange={(e) => handleRadioChange(field.id, e.target.value)}
                            className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                          />
                          <label htmlFor={`${field.id}-${option.id}`} className="text-gray-700">
                            {option.value}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {field.type === "checkbox" && field.options && field.options.length > 0 && (
                    <div className="ml-2 space-y-3">
                      {field.options.map((option) => (
                        <div key={option.id} className="flex items-center">
                          <input
                            type="checkbox"
                            id={`${field.id}-${option.id}`}
                            value={option.value}
                            checked={(responses[field.id] || []).includes(option.value)}
                            onChange={(e) => handleCheckboxChange(field.id, option.value, e.target.checked)}
                            className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 rounded"
                          />
                          <label htmlFor={`${field.id}-${option.id}`} className="text-gray-700">
                            {option.value}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {field.type === "select" && field.options && field.options.length > 0 && (
                    <select
                      value={responses[field.id] || ""}
                      onChange={(e) => handleSelectChange(field.id, e.target.value)}
                      className="border border-gray-300 p-3 w-full rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    >
                      <option value="" disabled>Select an option</option>
                      {field.options.map((option) => (
                        <option key={option.id} value={option.value}>
                          {option.value}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            ))}
          </div>
         {form?.requiresLocation? ( <div className="p-1 bg-gray-100">
                  <div className="w-full h-[400px] rounded-md overflow-hidden">
                    <MapsCompFill />
                  </div>
        </div>): null}
          
          {/* Submit Button */}
          <div className="mt-8 flex items-center justify-center">
            <button 
              onClick={handleSubmit} 
              disabled={submitLoading || 
                (form?.requiresLocation && !isWithinArea) || 
                (form?.restrictByDomain && !isDomainAllowed)}
              className={`px-6 py-3 rounded-md text-white font-medium flex items-center justify-center transition-all ${
                submitLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : (form?.requiresLocation && !isWithinArea) || (form?.restrictByDomain && !isDomainAllowed)
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg'
              }`}
            >
              {submitLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Submit Form'
              )}
            </button>
          </div>
          
          {form?.restrictByDomain && !isDomainAllowed && (
            <p className="text-center text-sm text-red-600 mt-2">
              You cannot submit this form because your email domain is not allowed.
            </p>
          )}
        </div>
        
      </div>
    );
  } else {
    return <Auth onLogin={setUser} />;
  }
};

export default FillForm;
