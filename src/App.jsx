import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import CreateForm from "./pages/CreateForm";
import FillForm from "./pages/FillForm";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateForm />} />
        <Route path="/fill/:formId" element={<FillForm />} />
        <Route path="/admin/:formId" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}

export default App;
