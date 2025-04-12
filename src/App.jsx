import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import CreateForm from "./pages/CreateForm";
import FillForm from "./pages/FillForm";
import AdminPage from "./pages/AdminPage";
import { DrawingProvider, useDrawingContext } from "./map_comp/context/DrawingContext";

function App() {
  return (

   <DrawingProvider>
     <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateForm />} />
        <Route path="/fill/:formId" element={<FillForm />} />
        <Route path="/admin/:formId" element={<AdminPage />} />
      </Routes>
    </Router>
   </DrawingProvider>
  );
}

export default App;
