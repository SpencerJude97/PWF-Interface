import React from 'react';
import { Routes, Route, Navigate } from "react-router-dom";
import './App.css';
import { getToken } from './api.js';
import KeyEntry from "./pages/KeyEntry.jsx";
import WalkFinder from './pages/WalkFinder.jsx';
import Preferences from './pages/Preferences.jsx'

const RequireKey = ({ children }) => (getToken() ? children : <Navigate to="/" replace />);

const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Pleasant Walk Finder</h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<KeyEntry />} />
          <Route path="/main" element={<RequireKey><WalkFinder /></RequireKey>} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="*" element={<h2>404 - Page Not Found</h2>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;