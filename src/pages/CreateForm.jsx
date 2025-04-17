import { useState, useEffect } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { useDrawingContext } from "../map_comp/context/DrawingContext";
import MapsComp from "../map_comp/MapsComp";

const CreateForm = () => {
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  
  // Get user location and state from DrawingContext
  const {state, userLocation} = useDrawingContext();
  
  // Add map to the form
  const [defineArea, setDefineArea] = useState(false);
  const [area, setArea] = useState(null);
  const [areaSelected, setAreaSelected] = useState(false);

  // Ensure user is logged in
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/");
    }
  }, [navigate]);

  const addMap = () => {
    setDefineArea(!defineArea);
    if (!defineArea) {
      // Reset area when adding map
      setArea(null);
      setAreaSelected(false);
    }
  };

  // Save the first drawn shape from the state
  const saveArea = () => {
    if (!state.now || state.now.length === 0) {
      alert("Please define the area on the map.");
      return;
    }

    // Take only the first shape drawn
    const firstShape = state.now[0];
    setArea(firstShape);
    setAreaSelected(true);
    
    alert("Area saved successfully! Only the first drawn shape will be used.");
  };

  // Add a new input field
  const addField = () => {
    setFields([...fields, { 
      id: uuidv4(), 
      question: "", 
      type: "text",
      options: []
    }]);
  };

  // Delete a field
  const deleteField = (id) => {
    setFields(fields.filter(field => field.id !== id));
  };

  // Add option to a field
  const addOption = (fieldId) => {
    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, options: [...field.options, { id: uuidv4(), value: "" }] } 
        : field
    ));
  };

  // Delete option from a field
  const deleteOption = (fieldId, optionId) => {
    setFields(fields.map(field => 
      field.id === fieldId 
        ? { ...field, options: field.options.filter(option => option.id !== optionId) } 
        : field
    ));
  };

  // Update field question
  const updateFieldQuestion = (id, question) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, question } : field
    ));
  };

  // Update field type
  const updateFieldType = (id, type) => {
    setFields(fields.map(field => 
      field.id === id ? { ...field, type, options: type === "text" ? [] : field.options } : field
    ));
  };

  // Update option value
  const updateOptionValue = (fieldId, optionId, value) => {
    setFields(fields.map(field => 
      field.id === fieldId 
        ? { 
            ...field, 
            options: field.options.map(option => 
              option.id === optionId ? { ...option, value } : option
            ) 
          } 
        : field
    ));
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!auth.currentUser) {
      alert("Please log in first to create a form.");
      return;
    }

    if (!title.trim()) {
      alert("Please enter a form title.");
      return;
    }

    if (fields.length === 0) {
      alert("Please add at least one field to your form.");
      return;
    }

    if (fields.some(f => !f.question.trim())) {
      alert("Please fill all question fields.");
      return;
    }

    // Validate that fields with options have at least one option
    const invalidFields = fields.filter(f => 
      (f.type === "radio" || f.type === "checkbox" || f.type === "select") && 
      (f.options.length === 0 || f.options.some(o => !o.value.trim()))
    );

    if (invalidFields.length > 0) {
      alert("Please add at least one option to each radio, checkbox, or select field and ensure all options have values.");
      return;
    }

    // Validate area if map is enabled
    if (defineArea && !areaSelected) {
      alert("Please save the area on the map before creating the form.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formId = uuidv4();
      
      // Create the form data to save to Firebase
      const formData = {
        id: formId,
        title,
        fields,
        creator: auth.currentUser.uid,
        createdAt: new Date(),
        closed: false,
        requiresLocation: defineArea,
      };
      
      // Add area data if defined, making sure to serialize properly
      if (defineArea && area) {
        // Create a safe copy of the data, ensuring it's serializable
        const locationData = {
          type: area.type,
        };
        
        // Handle different shape types differently to ensure proper serialization
        if (area.type === 'circle') {
          locationData.coordinates = {
            center: {
              lat: area.snapshot.center.lat,
              lng: area.snapshot.center.lng
            },
            radius: area.snapshot.radius
          };
        } else if (area.type === 'rectangle') {
          const bounds = area.snapshot.bounds;
          locationData.coordinates = {
            bounds: {
              north: bounds.north,
              south: bounds.south,
              east: bounds.east,
              west: bounds.west
            }
          };
        } else if (area.type === 'polygon') {
          // Convert each LatLng object to a plain object
          locationData.coordinates = {
            path: area.snapshot.path.map(point => ({
              lat: typeof point.lat === 'function' ? point.lat() : point.lat,
              lng: typeof point.lng === 'function' ? point.lng() : point.lng
            }))
          };
        }
        
        formData.locationRestriction = locationData;
      }
      
      console.log("Saving form data:", formData);
      
      // Save form to Firebase
      await addDoc(collection(db, "forms"), formData);
      
      navigate(`/admin/${formId}`);
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Failed to save the form. Try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="p-6 border-b border-gray-200 flex items-center">
            <img src="/logo.svg" alt="FormBuilder Logo" className="h-8 w-8 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Create New Form</h1>
              <p className="text-gray-600 mt-2">Design your form by adding fields and customizing options</p>
            </div>
          </div>
          
          {/* Form Title */}
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Form Title</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Enter form title" 
              className="border border-gray-300 p-3 w-full rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
        </div>
        
        {/* Form Fields */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Form Fields</h2>
            <button 
              onClick={addField} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md shadow-sm transition-all duration-200 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Field
            </button>
          </div>
          
          {fields.length > 0 ? (
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div 
                  key={field.id} 
                  className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="p-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <span className="font-medium text-gray-700">Field {index + 1}</span>
                    <button 
                      onClick={() => deleteField(field.id)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                        <input 
                          type="text" 
                          value={field.question} 
                          onChange={(e) => updateFieldQuestion(field.id, e.target.value)} 
                          placeholder="Enter your question" 
                          className="border border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                        />
                      </div>
                      
                      <div className="sm:w-1/3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                        <select 
                          value={field.type}
                          onChange={(e) => updateFieldType(field.id, e.target.value)}
                          className="border border-gray-300 p-2 w-full rounded-md focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400"
                        >
                          <option value="text">Text</option>
                          <option value="radio">Radio Buttons</option>
                          <option value="checkbox">Checkboxes</option>
                          <option value="select">Dropdown</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Options for radio/checkbox/select */}
                    {(field.type === "radio" || field.type === "checkbox" || field.type === "select") && (
                      <div className="mt-4 border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block text-sm font-medium text-gray-700">Options</label>
                          <button 
                            onClick={() => addOption(field.id)}
                            className="text-xs bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add Option
                          </button>
                        </div>
                        
                        {field.options.length > 0 ? (
                          <div className="space-y-2">
                            {field.options.map((option) => (
                              <div key={option.id} className="flex items-center">
                                <input 
                                  type="text"
                                  value={option.value}
                                  onChange={(e) => updateOptionValue(field.id, option.id, e.target.value)}
                                  placeholder="Option text"
                                  className="border border-gray-300 p-1.5 flex-grow rounded-md mr-2"
                                />
                                <button 
                                  onClick={() => deleteOption(field.id, option.id)}
                                  className="bg-red-100 text-red-600 hover:bg-red-200 p-1 rounded-md"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 italic">
                            No options added yet. Add options for users to select from.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-1">No fields added yet</h3>
              <p className="text-gray-600 mb-4">Add fields to create your form</p>
              <button 
                onClick={addField} 
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add First Field
              </button>
            </div>
          )}
        </div>
        
        {/* Location Restriction */}
        <div className="mb-8 bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6 flex justify-between items-center border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Location Restriction</h2>
              <p className="text-gray-600 text-sm mt-1">
                {defineArea 
                  ? "Users will only be able to submit this form from within the defined area" 
                  : "Add location restrictions to your form"}
              </p>
            </div>
            <button 
              onClick={addMap}
              className={`${
                defineArea 
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              } text-white px-4 py-2 rounded-md shadow-sm transition-all duration-200`}
            >
              {!defineArea ? "Add Restriction" : "Remove Restriction"}
            </button>
          </div>
          
          {defineArea && (
            <div>
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <span className="text-sm text-gray-600">
                  {areaSelected 
                    ? "Area selected successfully!" 
                    : "Draw and save a region on the map below"}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  areaSelected ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {areaSelected ? 'Area Saved' : 'Not Saved'}
                </span>
              </div>
              
              <div className="p-1 bg-gray-100">
                <div className="w-full h-[400px] rounded-md overflow-hidden">
                  <MapsComp />
                </div>
              </div>
              
              <div className="p-4 bg-white flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  Draw a shape on the map to restrict form submissions to users within this area.
                  <br />Only the first shape drawn will be used.
                </p>
                <button 
                  onClick={saveArea}
                  className={`px-4 py-2 rounded-md ${
                    areaSelected 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white shadow-sm transition-all duration-200`}
                >
                  {areaSelected ? 'Update Area' : 'Save Area'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Create Form Button */}
        <div className="flex justify-center pb-10">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting} 
            className={`${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-yellow-600 hover:bg-yellow-700'
            } text-white px-8 py-3 rounded-lg shadow-md transition-all duration-200 font-medium text-lg flex items-center`}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Create Form
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateForm;
