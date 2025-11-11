import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Home from './pages/Home';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import CreateTest from './pages/CreateTest';
import QuestionGenerator from './pages/QuestionGenerator';
import TakeTest from './pages/TakeTest';
import TestResults from './pages/TestResults';
import AdminPanel from './pages/AdminPanel';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <div className="container mt-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Auth />} />
            <Route path="/register" element={<Auth />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/create-test" element={
              <ProtectedRoute>
                <CreateTest />
              </ProtectedRoute>
            } />
            <Route path="/question-generator" element={
              <ProtectedRoute>
                <QuestionGenerator />
              </ProtectedRoute>
            } />
            <Route path="/take-test/:testId" element={
              <ProtectedRoute>
                <TakeTest />
              </ProtectedRoute>
            } />
            <Route path="/test-results/:testId" element={
              <ProtectedRoute>
                <TestResults />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true}>
                <AdminPanel />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
