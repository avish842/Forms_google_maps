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
    setFields([...fields, { id: uuidv4(), question: "", type: "text" }]);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!auth.currentUser) {
      alert("Please log in first to create a form.");
      return;
    }

    if (!title.trim() || fields.some(f => !f.question.trim())) {
      alert("Please enter a title and fill all fields.");
      return;
    }

    try {
      const formId = uuidv4();
      await addDoc(collection(db, "forms"), {
        id: formId,
        title,
        fields,
        creator: auth.currentUser.uid, // Ensure the user is logged in
      });

      navigate(`/admin/${formId}`); // Redirect to admin panel for responses
    } catch (error) {
      console.error("Error saving form:", error);
      alert("Failed to save the form. Try again.");
    }
  };

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">Create Form</h1>
      <input 
        type="text" 
        value={title} 
        onChange={(e) => setTitle(e.target.value)} 
        placeholder="Form Title" 
        className="border p-2 w-full"
      />
      
      {fields.map((field, index) => (
        <input 
          key={field.id} 
          type="text" 
          placeholder="Question" 
          onChange={(e) => {
            const updatedFields = [...fields];
            updatedFields[index].question = e.target.value;
            setFields(updatedFields);
          }} 
          className="border p-2 w-full my-2"
        />
      ))}

      <button onClick={addField} className="bg-gray-500 p-2 text-white mr-2">Add Field</button>
      <button onClick={handleSubmit} className="bg-blue-500 p-2 text-white">Create Form</button>
    </div>
  );
};

export default CreateForm;
