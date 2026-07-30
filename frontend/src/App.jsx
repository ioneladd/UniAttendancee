import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CourseDetails from './pages/CourseDetails';
import SessionDetails from './pages/SessionDetails';
import StudentCourseDetails from './pages/StudentCourseDetail'; 
import { Statistics } from './pages/Statistics'; 
import { Toaster } from 'react-hot-toast';
import GuestScan from './pages/GuestScan'; 

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Se încarcă...</div>;
  }

  return (
    <BrowserRouter>
      <Toaster position="top-center" />
      <Routes>
        <Route 
          path="/session/:sessionId" 
          element={user ? <SessionDetails user={user} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={user ? <Navigate to="/dashboard" /> : <Login />} 
        />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard /> : <Navigate to="/" />} 
        />
        <Route 
          path="/course/:courseId" 
          element={user ? <CourseDetails user={user} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/statistics" 
          element={user ? <Statistics user={user} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/guest-scan" 
          element={<GuestScan />} 
        />
        <Route 
          path="/student/course/:courseId" 
          element={user ? <StudentCourseDetails user={user} /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;