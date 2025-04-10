import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import Auth from "../components/Auth";

const FillForm = () => {
  const { formId } = useParams();
  const [form, setForm] = useState(null);
  const [responses, setResponses] = useState({});
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

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

    try {
      await addDoc(collection(db, "responses"), {
        formId,
        responses,
        userId: user.uid,
        userName: user.displayName || user.email,
        submittedAt: new Date()
      });
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
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
      >
        Submit
      </button>
    </div>
  ) : (
    <Auth onLogin={setUser} />
  );
};

export default FillForm;
