import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { db, auth } from "../firebaseConfig";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";

const AdminPage = () => {
  const { formId } = useParams();
  const [responses, setResponses] = useState([]);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [expandedResponse, setExpandedResponse] = useState(null);
  const [formActive, setFormActive] = useState(true);
  const [formClosed, setFormClosed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [documentId, setDocumentId] = useState(null);
  
  // Get the current date for display formatting
  const currentDate = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchFormAndResponses = async () => {
      setLoading(true);
      try {
        // 🔹 Fetch form details first
        const formQuery = query(collection(db, "forms"), where("id", "==", formId));
        const formSnapshot = await getDocs(formQuery);

        if (!formSnapshot.empty) {
          const formDoc = formSnapshot.docs[0];
          const formData = formDoc.data();
          setForm(formData);
          setDocumentId(formDoc.id);
          
          // Set form status
          setFormActive(formData.active !== false); // Default to true if not set
          setFormClosed(formData.closed === true);  // Default to false if not set
          
          // 🔹 Fetch responses for the form
          const responseQuery = query(collection(db, "responses"), where("formId", "==", formId));
          const responseSnapshot = await getDocs(responseQuery);

          if (!responseSnapshot.empty) {
            const responsesData = responseSnapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                ...data,
                // Format date for display
                formattedDate: data.submittedAt ? 
                  new Date(data.submittedAt.seconds * 1000).toLocaleString() : 
                  "Unknown date"
              };
            });
            setResponses(responsesData);
          } else {
            console.warn("⚠️ No responses found for this form.");
          }
        } else {
          console.error("❌ No form found with id:", formId);
          return;
        }
      } catch (error) {
        console.error("❌ Error fetching form or responses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFormAndResponses();
  }, [formId]);

  // Download as Excel
  const downloadExcel = () => {
    if (!form || responses.length === 0) return;

    // Create header row with questions
    const headers = ["Respondent", "Email", "Submission Date"];
    form.fields.forEach(field => headers.push(field.question));
    
    // Create data rows
    const data = responses.map(response => {
      const row = [
        response.userName || "Anonymous", 
        response.userEmail || "No email",
        response.formattedDate
      ];
      
      // Add responses to each question
      form.fields.forEach(field => {
        if (field.type === "checkbox") {
          row.push((response.responses[field.id] || []).join(", "));
        } else {
          row.push(response.responses[field.id] || "N/A");
        }
      });
      
      return row;
    });
    
    // Combine headers and data
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 15) }));
    worksheet["!cols"] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Responses");

    // Generate Excel file with formatted name and date
    XLSX.writeFile(workbook, `${form.title || "Form"}_Responses_${currentDate}.xlsx`);
  };

  // Download as CSV
  const downloadCSV = () => {
    if (!form || responses.length === 0) return;
    
    // Create header row
    const headers = ["Respondent", "Email", "Submission Date"];
    form.fields.forEach(field => headers.push(field.question));
    
    // Create CSV content
    let csvContent = headers.map(h => `"${h}"`).join(",") + "\r\n";
    
    responses.forEach(response => {
      const row = [
        `"${response.userName || "Anonymous"}"`,
        `"${response.userEmail || "No email"}"`,
        `"${response.formattedDate}"`
      ];
      
      form.fields.forEach(field => {
        if (field.type === "checkbox") {
          row.push(`"${(response.responses[field.id] || []).join(", ")}"`);
        } else {
          row.push(`"${response.responses[field.id] || "N/A"}"`);
        }
      });
      
      csvContent += row.join(",") + "\r\n";
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${form.title || "Form"}_Responses_${currentDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Sorting functionality
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Apply sorting to responses
  const getSortedResponses = () => {
    const sortableResponses = [...responses];
    if (sortConfig.key) {
      sortableResponses.sort((a, b) => {
        // Handle special case for dates
        if (sortConfig.key === 'date') {
          const dateA = a.submittedAt ? a.submittedAt.seconds : 0;
          const dateB = b.submittedAt ? b.submittedAt.seconds : 0;
          if (sortConfig.direction === 'ascending') {
            return dateA - dateB;
          }
          return dateB - dateA;
        }
        
        // Special case for respondent name
        if (sortConfig.key === 'respondent') {
          const nameA = a.userName || '';
          const nameB = b.userName || '';
          if (sortConfig.direction === 'ascending') {
            return nameA.localeCompare(nameB);
          }
          return nameB.localeCompare(nameA);
        }
        
        // General case for other fields
        const fieldA = a.responses[sortConfig.key] || '';
        const fieldB = b.responses[sortConfig.key] || '';
        
        if (sortConfig.direction === 'ascending') {
          return fieldA < fieldB ? -1 : fieldA > fieldB ? 1 : 0;
        } else {
          return fieldB < fieldA ? -1 : fieldB > fieldA ? 1 : 0;
        }
      });
    }
    return sortableResponses;
  };

  // Filter responses by search term
  const getFilteredResponses = () => {
    const sortedResponses = getSortedResponses();
    
    // First apply the selected filter
    let filtered = sortedResponses;
    if (selectedFilter === "today") {
      const today = new Date().setHours(0, 0, 0, 0);
      filtered = sortedResponses.filter(response => 
        response.submittedAt && new Date(response.submittedAt.seconds * 1000) >= today
      );
    } else if (selectedFilter === "lastWeek") {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      filtered = sortedResponses.filter(response => 
        response.submittedAt && new Date(response.submittedAt.seconds * 1000) >= lastWeek
      );
    }
    
    // Then apply search term if present
    if (searchTerm.trim() === "") return filtered;
    
    return filtered.filter(response => {
      // Search in respondent name and email
      if (response.userName && response.userName.toLowerCase().includes(searchTerm.toLowerCase())) return true;
      if (response.userEmail && response.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) return true;
      
      // Search in responses
      for (const fieldId in response.responses) {
        const value = response.responses[fieldId];
        if (Array.isArray(value)) {
          // For checkbox responses
          if (value.some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))) return true;
        } else if (typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())) {
          return true;
        }
      }
      
      return false;
    });
  };

  // Toggle expanded view for a response
  const toggleExpandResponse = (index) => {
    if (expandedResponse === index) {
      setExpandedResponse(null);
    } else {
      setExpandedResponse(index);
    }
  };

  // Get response count summary
  const getResponseSummary = () => {
    if (!responses.length) return null;
    
    // Get today's responses
    const today = new Date().setHours(0, 0, 0, 0);
    const todayResponses = responses.filter(response => 
      response.submittedAt && new Date(response.submittedAt.seconds * 1000) >= today
    ).length;
    
    return (
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="bg-indigo-50 rounded-md p-3 flex-1 min-w-[120px]">
          <p className="text-sm text-indigo-700">Total Responses</p>
          <p className="text-2xl font-bold text-indigo-900">{responses.length}</p>
        </div>
        <div className="bg-green-50 rounded-md p-3 flex-1 min-w-[120px]">
          <p className="text-sm text-green-700">Today</p>
          <p className="text-2xl font-bold text-green-900">{todayResponses}</p>
        </div>
      </div>
    );
  };

  // Toggle form active status
  const toggleFormStatus = async () => {
    if (!documentId) {
      alert("Cannot update form: Document ID not found");
      return;
    }
    
    setUpdating(true);
    try {
      const formRef = doc(db, "forms", documentId);
      const newStatus = !formActive;
      
      await updateDoc(formRef, {
        active: newStatus
      });
      
      setFormActive(newStatus);
      setForm(prev => ({
        ...prev,
        active: newStatus
      }));
      
      alert(`Form ${newStatus ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error("Error updating form status:", error);
      alert("Failed to update form status.");
    } finally {
      setUpdating(false);
    }
  };

  // Close form completely
  const closeForm = async () => {
    if (!documentId) {
      alert("Cannot close form: Document ID not found");
      return;
    }
    
    if (!confirm("Are you sure you want to permanently close this form?\n\nThis will prevent any new submissions and cannot be undone.")) {
      return;
    }
    
    setUpdating(true);
    try {
      const formRef = doc(db, "forms", documentId);
      
      await updateDoc(formRef, {
        closed: true,
        active: false,
        closedAt: new Date()
      });
      
      setFormClosed(true);
      setFormActive(false);
      setForm(prev => ({
        ...prev,
        closed: true,
        active: false,
        closedAt: new Date()
      }));
      
      alert("Form closed successfully!");
    } catch (error) {
      console.error("Error closing form:", error);
      alert("Failed to close form.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-50 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button and form controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div className="mb-4 sm:mb-0">
            <Link 
              to="/"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 mb-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to Forms
            </Link>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <img src="/logo.svg" alt="FormBuilder Logo" className="h-8 w-8 mr-3" />
              <span>{form?.title || "Loading..."}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              Review and analyze form responses
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            {form && !formClosed && (
              <button 
                onClick={toggleFormStatus}
                disabled={updating}
                className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                  updating ? 'bg-gray-400 text-white cursor-not-allowed' :
                  formActive 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {updating ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : formActive ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                    </svg>
                    Disable Form
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Enable Form
                  </>
                )}
              </button>
            )}
            
            {form && !formClosed && (
              <button 
                onClick={closeForm}
                disabled={updating}
                className={`flex items-center justify-center px-4 py-2 rounded-md transition-colors ${
                  updating ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                Close Form
              </button>
            )}
            
            {responses.length > 0 && (
              <div className="dropdown relative">
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Export Data
                </button>
                <div className="dropdown-content absolute right-0 mt-2 hidden bg-white shadow-lg rounded-md w-48 z-10 border border-gray-100">
                  <button 
                    onClick={downloadExcel}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    Excel Format (.xlsx)
                  </button>
                  <button 
                    onClick={downloadCSV}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100"
                  >
                    CSV Format (.csv)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Form Status Banner */}
        {form && formClosed && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
            <div className="mr-3 bg-red-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Form is permanently closed</h3>
              <p className="text-sm text-red-700">
                This form has been closed {form.closedAt ? `on ${new Date(form.closedAt.seconds * 1000).toLocaleDateString()}` : ''} 
                and cannot accept new responses.
              </p>
            </div>
            <div className="ml-4">
              <button
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/fill/${formId}`)}
                className="text-xs bg-red-100 hover:bg-red-200 text-red-800 py-1 px-2 rounded transition-colors"
              >
                Copy Link
              </button>
            </div>
          </div>
        )}
        
        {form && !formClosed && !formActive && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-center">
            <div className="mr-3 bg-yellow-100 rounded-full p-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-yellow-800">Form is currently disabled</h3>
              <p className="text-sm text-yellow-700">Users cannot submit new responses. Enable the form to allow submissions.</p>
            </div>
          </div>
        )}
        
        {/* Response Summary */}
        {getResponseSummary()}
        
        {/* Filter and Search Controls */}
        {responses.length > 0 && (
          <div className="mb-6 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search responses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="border border-gray-300 rounded-md leading-5 bg-white py-2 pl-3 pr-10 text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Responses</option>
              <option value="today">Today</option>
              <option value="lastWeek">Last 7 Days</option>
            </select>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : responses.length > 0 ? (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* Responsive design - card view for mobile, table for desktop */}
            <div className="hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('respondent')}>
                        Respondent
                        {sortConfig.key === 'respondent' && (
                          <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('date')}>
                        Date
                        {sortConfig.key === 'date' && (
                          <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                        )}
                      </th>
                      {form?.fields.map((field) => (
                        <th 
                          key={field.id} 
                          scope="col" 
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort(field.id)}
                        >
                          {field.question}
                          {sortConfig.key === field.id && (
                            <span className="ml-1">{sortConfig.direction === 'ascending' ? '↑' : '↓'}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getFilteredResponses().map((response, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">{response.userName || "Anonymous"}</div>
                            <div className="text-sm text-gray-500">{response.userEmail || "No email"}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {response.formattedDate}
                        </td>
                        {form?.fields.map((field) => (
                          <td key={field.id} className="px-6 py-4">
                            {field.type === "checkbox" ? (
                              <ul className="list-disc pl-5">
                                {(response.responses[field.id] || []).map((item, i) => (
                                  <li key={i} className="text-sm text-gray-700">{item}</li>
                                ))}
                              </ul>
                            ) : (
                              <span className="text-sm text-gray-700">
                                {response.responses[field.id] || "N/A"}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Mobile card view */}
            <div className="md:hidden space-y-4 p-4">
              {getFilteredResponses().map((response, index) => (
                <div key={index} className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{response.userName || "Anonymous"}</p>
                      <p className="text-xs text-gray-500">{response.formattedDate}</p>
                    </div>
                    <button 
                      onClick={() => toggleExpandResponse(index)}
                      className="text-indigo-600"
                    >
                      {expandedResponse === index ? 'Hide' : 'View'}
                    </button>
                  </div>
                  
                  {expandedResponse === index && (
                    <div className="p-4 space-y-3 border-t">
                      {form?.fields.map((field) => (
                        <div key={field.id} className="border-b pb-2 last:border-b-0">
                          <p className="text-xs text-gray-500">{field.question}</p>
                          {field.type === "checkbox" ? (
                            <ul className="list-disc pl-5">
                              {(response.responses[field.id] || []).map((item, i) => (
                                <li key={i} className="text-sm text-gray-700">{item}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm font-medium text-gray-800">
                              {response.responses[field.id] || "N/A"}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-800">No responses yet</h3>
            <p className="text-gray-600 mb-6">Share your form with others to start collecting responses</p>
            <button
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}/fill/${formId}`)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
              </svg>
              Copy Form Link
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
