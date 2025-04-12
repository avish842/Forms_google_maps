import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import Auth from "../components/Auth";
import { useDrawingContext } from "../map_comp/context/DrawingContext";

const FillForm = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [isWithinArea, setIsWithinArea] = useState(true); // Default to true for forms without area restrictions
  const { userLocation } = useDrawingContext(); // Get user's current location

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
    }
  };

  if (loading) return <p className="text-center mt-5">🔄 Loading form...</p>;
  
  if (submitted) {
    return (
      <div className="p-5 max-w-4xl mx-auto text-center">
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded my-4">
          <h2 className="text-2xl font-bold mb-2">✅ Form Submitted Successfully!</h2>
          <p>Thank you for your response.</p>
        </div>
      </div>
    );
  }

  return user ? (
    <div className="p-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">{form?.title || "Untitled Form"}</h1>
      
      {/* Show location warning if needed */}
      {form?.requiresLocation && (
        <div className={`mb-4 p-3 rounded-md ${isWithinArea ? 'bg-green-100' : 'bg-red-100'}`}>
          <div className="flex items-center">
            {isWithinArea ? (
              <>
                <span className="text-green-700 mr-2">✓</span>
                <p className="text-green-700">You are within the required area for this form.</p>
              </>
            ) : (
              <>
                <span className="text-red-700 mr-2">⚠️</span>
                <p className="text-red-700">You must be within the designated area to submit this form.</p>
              </>
            )}
          </div>
          {!userLocation && (
            <p className="text-amber-700 mt-2">
              Location access is required. Please ensure your device's location services are enabled.
            </p>
          )}
        </div>
      )}
      
      {form?.fields?.map((field) => (
        <div key={field.id} className="mb-6 p-4 border rounded-md bg-gray-50">
          <label className="block text-lg font-medium mb-2">{field.question}</label>
          
          {field.type === "text" && (
            <input
              type="text"
              value={responses[field.id] || ""}
              onChange={(e) => handleTextChange(field.id, e.target.value)}
              placeholder="Your answer"
              className="border p-2 w-full rounded-md"
            />
          )}
          
          {field.type === "radio" && field.options && field.options.length > 0 && (
            <div className="ml-2 space-y-2">
              {field.options.map((option) => (
                <div key={option.id} className="flex items-center">
                  <input
                    type="radio"
                    id={`${field.id}-${option.id}`}
                    name={field.id}
                    value={option.value}
                    checked={responses[field.id] === option.value}
                    onChange={(e) => handleRadioChange(field.id, e.target.value)}
                    className="mr-2"
                  />
                  <label htmlFor={`${field.id}-${option.id}`}>{option.value}</label>
                </div>
              ))}
            </div>
          )}
          
          {field.type === "checkbox" && field.options && field.options.length > 0 && (
            <div className="ml-2 space-y-2">
              {field.options.map((option) => (
                <div key={option.id} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`${field.id}-${option.id}`}
                    value={option.value}
                    checked={(responses[field.id] || []).includes(option.value)}
                    onChange={(e) => handleCheckboxChange(field.id, option.value, e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor={`${field.id}-${option.id}`}>{option.value}</label>
                </div>
              ))}
            </div>
          )}
          
          {field.type === "select" && field.options && field.options.length > 0 && (
            <select
              value={responses[field.id] || ""}
              onChange={(e) => handleSelectChange(field.id, e.target.value)}
              className="border p-2 w-full rounded-md"
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
      ))}
      
      <button 
        onClick={handleSubmit} 
        className={`px-4 py-2 rounded-md transition-colors ${
          (form?.requiresLocation && !isWithinArea) 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
        disabled={form?.requiresLocation && !isWithinArea}
      >
        Submit
      </button>
    </div>
  ) : (
    <Auth onLogin={setUser} />
  );
};

export default FillForm;
