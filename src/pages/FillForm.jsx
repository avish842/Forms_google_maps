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

  const handleSubmit = async () => {
    if (!user) {
      alert("Please log in to submit the form.");
      return;
    }

    try {
      await addDoc(collection(db, "responses"), {
        formId,
        responses,
        userId: user.uid
      });
      alert("✅ Form submitted successfully!");
    } catch (error) {
      console.error("❌ Error submitting form:", error);
    }
  };

  if (loading) return <p className="text-center mt-5">🔄 Loading form...</p>;

  return user ? (
    <div className="p-5">
      <h1 className="text-2xl font-bold mb-4">My Form: {form?.title || "Untitled Form"}</h1>
      {form?.fields?.map((field) => (
        <div key={field.id} className="mb-4">
          <label className="block text-lg mb-2">{field.question}</label>
          <input
            type="text"
            placeholder={field.question}
            onChange={(e) => setResponses({ ...responses, [field.id]: e.target.value })}
            className="border p-2 w-full"
          />
        </div>
      ))}
      <button onClick={handleSubmit} className="bg-blue-500 text-white px-4 py-2 rounded">
        Submit
      </button>
    </div>
  ) : (
    <Auth onLogin={setUser} />
  );
};

export default FillForm;
