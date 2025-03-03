import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import CreateForm from "./pages/CreateForm";
import FillForm from "./pages/FillForm";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="adt1.vercel.app/" element={<Home />} />
        <Route path="adt1.vercel.app/create" element={<CreateForm />} />
        <Route path="adt1.vercel.app/fill/:formId" element={<FillForm />} />
        <Route path="adt1.vercel.app/admin/:formId" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
