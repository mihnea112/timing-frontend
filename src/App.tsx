// App.tsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import AdminPage from "./pages/Adminpage";
import RacersPage from "./pages/Racerspage";

function App() {
  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Router>
        <div className="p-4 max-w-8xl mx-auto">
          <nav className="flex gap-4 mb-6 text-lg font-semibold text-blue-400">
            <Link to="/">🏁 Sectiune administatior</Link>
            <Link to="/racers">📊 Panou Timpi</Link>
          </nav>
          <Routes>
            <Route path="/" element={<AdminPage />} />
            <Route path="/racers" element={<RacersPage />} />
          </Routes>
        </div>
      </Router>
    </div>
  );
}

export default App;
