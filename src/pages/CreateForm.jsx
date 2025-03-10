import { useState } from "react";
import { db, auth } from "../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

const CreateForm = () => {
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState([]);
  const navigate = useNavigate();

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

    try {
      const formId = uuidv4();
      await addDoc(collection(db, "forms"), {
        id: formId,
        title,
        fields,
        creator: auth.currentUser.uid,
        createdAt: new Date(),
      });

      navigate(`/admin/${formId}`);
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Failed to save the form. Try again.");
    }
  };

  return (
    <div className="p-5 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Create Form</h1>
      
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Form Title</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="Form Title" 
          className="border p-2 w-full rounded-md"
        />
      </div>
      
      {fields.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-xl font-medium mb-4">Form Fields</h2>
          {fields.map((field) => (
            <div key={field.id} className="border p-4 mb-4 rounded-md bg-gray-50">
              <div className="flex justify-between mb-2">
                <input 
                  type="text" 
                  value={field.question} 
                  onChange={(e) => updateFieldQuestion(field.id, e.target.value)} 
                  placeholder="Question" 
                  className="border p-2 flex-grow mr-2 rounded-md"
                />
                
                <select 
                  value={field.type}
                  onChange={(e) => updateFieldType(field.id, e.target.value)}
                  className="border p-2 rounded-md min-w-0"
                >
                  <option value="text">Text</option>
                  <option value="radio">Radio Buttons</option>
                  <option value="checkbox">Checkboxes</option>
                  <option value="select">Dropdown</option>
                </select>
              </div>
              
              {(field.type === "radio" || field.type === "checkbox" || field.type === "select") && (
                <div className="ml-4 mt-3">
                  <label className="block text-gray-700 mb-1">Options</label>
                  {field.options.map((option) => (
                    <div key={option.id} className="flex items-center mb-2">
                      <input 
                        type="text"
                        value={option.value}
                        onChange={(e) => updateOptionValue(field.id, option.id, e.target.value)}
                        placeholder="Option text"
                        className="border p-1 flex-grow mr-2 rounded-md"
                      />
                      <button 
                        onClick={() => deleteOption(field.id, option.id)}
                        className="bg-red-500 text-white p-1 px-2 rounded-md "
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => addOption(field.id)}
                    className="bg-green-500 text-white p-1 px-2 rounded-md text-sm"
                  >
                    + Add Option
                  </button>
                </div>
              )}
              
              <div className="mt-3 text-right">
                <button 
                  onClick={() => deleteField(field.id)}
                  className="bg-red-500 text-white py-1 px-3 rounded-md active:bg-red-700 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  Delete Field
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 bg-gray-100 mb-6 rounded-md">
          <p>No fields added yet. Click "Add Field" to start creating your form.</p>
        </div>
      )}

      <div className="flex justify-between">
        <button 
          onClick={addField} 
          className="bg-green-600 p-2 text-white rounded-md active:bg-green-700 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          + Add Field
        </button>
        <button 
          onClick={handleSubmit} 
          className="bg-blue-600 p-2 text-white rounded-md active:bg-blue-700 active:scale-95 transition-all duration-200 cursor-pointer"
          disabled={fields.length === 0}
        >
          Create Form
        </button>
      </div>
    </div>
  );
};

export default CreateForm;
