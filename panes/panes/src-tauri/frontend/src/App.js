import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MyTasks from './pages/MyTasks';
import AssignedTasks from './pages/AssignedTasks';
import AllTasks from './pages/AllTasks';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/my-tasks" element={<PrivateRoute><MyTasks /></PrivateRoute>} />
          <Route path="/assigned-tasks" element={<PrivateRoute><AssignedTasks /></PrivateRoute>} />
          <Route path="/all-tasks" element={<PrivateRoute><AllTasks /></PrivateRoute>} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;