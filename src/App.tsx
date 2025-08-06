// App.tsx
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import AdminPage from "./pages/Adminpage";
import RacersPage from "./pages/Racerspage";

function App() {
  return (
    <div className="bg-gray-900 min-h-screen text-white">
      <Router>
        <div className="px-4 py-6 sm:px-6 lg:px-8 max-w-screen-xl mx-auto">
          <nav className="flex flex-col sm:flex-row sm:gap-6 gap-2 mb-6 text-base sm:text-lg font-semibold text-blue-400">
            <Link to="/">🏁 Sectiune administrator</Link>
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
