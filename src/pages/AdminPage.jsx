import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { db, auth } from "../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";

const AdminPage = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState(null);
  const [formtitle, setFormtitle] = useState("");

  useEffect(() => {
    const fetchFormAndResponses = async () => {
      try {
        console.log("🔍 Fetching form details for formId:", formId);

        // 🔹 Fetch form details first
        const formQuery = query(collection(db, "forms"), where("id", "==", formId));
        const formSnapshot = await getDocs(formQuery);

        if (!formSnapshot.empty) {
          const formData = formSnapshot.docs[0].data();
          console.log("✅ Form found:", formData);
          setForm(formData);
          setFormtitle(formData.title);
        } else {
          console.error("❌ No form found with id:", formId);
          return;
        }

        // 🔹 Fetch responses for the form
        const responseQuery = query(collection(db, "responses"), where("formId", "==", formId));
        const responseSnapshot = await getDocs(responseQuery);

        if (!responseSnapshot.empty) {
          const responsesData = responseSnapshot.docs.map((doc) => doc.data());
          console.log("✅ Responses found:", responsesData);
          setResponses(responsesData);
        } else {
          console.warn("⚠️ No responses found for this form.");
        }
      } catch (error) {
        console.error("❌ Error fetching form or responses:", error);
      }
    };

    fetchFormAndResponses();
  }, [formId]);
  const downloadExcel = () => {
    if (!form || responses.length === 0) return;

    // Create worksheet data
    const worksheet = XLSX.utils.aoa_to_sheet([
      // Header row with questions
      form.fields.map(field => field.question),
      
      // Data rows with responses
      ...responses.map(response => 
        form.fields.map(field => response.responses[field.id] || "N/A")
      )
    ]);

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

    // Generate Excel file and trigger download
    XLSX.writeFile(workbook, `${formtitle || "Form"}_Responses.xlsx`);
  };

  return (
    <div className="p-5">
     <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{formtitle || "Loading..."} - Responses</h1>
        
        {responses.length > 0 && (
          <button 
            onClick={downloadExcel}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded flex items-center cursor-pointer active:bg-green-700 active:scale-95 transition-all duration-200"
          >
            <span className="mr-2">📥</span> Download Excel
          </button>
        )}
      </div>
      {form ? (
        responses.length > 0 ? (
          <table className="w-full mt-4 border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-200">
                {form.fields.map((field) => (
                  <th key={field.id} className="border p-2">{field.question}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((response, index) => (
                <tr key={index} className="border">
                  {form.fields.map((field) => (
                    <td key={field.id} className="border p-2">{response.responses[field.id] || "N/A"}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500">No responses yet.</p>
        )
      ) : (
        <p className="text-red-500">Form not found or loading...</p>
      )}
    </div>
  );
};

export default AdminPage;
