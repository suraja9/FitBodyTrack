
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Auth screens
import Login from './components/Login';
import Signup from './components/Signup';

// App sections
import Dashboard from './components/Dashboard';
import Workouts from './components/Workouts';
import Nutrition from './components/Nutrition';
import Progress from './components/Progress';

// Shared UI
import Navigation from './components/Navigation';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        // If parsing fails, clear corrupted storage
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <>
    <Router>
      <div className="min-h-screen bg-gray-50">
        {user && <Navigation user={user} logout={logout} />}

        <Routes>
          {/* Auth routes */}
          <Route
            path="/login"
            element={
              user ? <Navigate to="/dashboard" replace /> : <Login setUser={setUser} />
            }
          />
          <Route
            path="/signup"
            element={
              user ? <Navigate to="/dashboard" replace /> : <Signup setUser={setUser} />
            }
          />

          {/* Protected app routes */}
          <Route
            path="/dashboard"
            element={
              user ? <Dashboard user={user} /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/workouts"
            element={
              user ? <Workouts /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/nutrition"
            element={
              user ? <Nutrition /> : <Navigate to="/login" replace />
            }
          />
          <Route
            path="/progress"
            element={
              user ? <Progress /> : <Navigate to="/login" replace />
            }
          />

          {/* Root and catch-all */}
          <Route
            path="/"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
          <Route
            path="*"
            element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </div>
    </Router>
  </>
  );
}

export default App;
