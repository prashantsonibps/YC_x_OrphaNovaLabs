import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/*" element={<Pages />} />
      </Routes>
      <Toaster />
    </Router>
  )
}

export default App 