import React from 'react';
import { Routes, Route } from "react-router-dom";
import './App.css';
import KeyEntry from "./pages/KeyEntry.jsx";
import WalkFinder from './pages/WalkFinder.jsx';
import Preferences from './pages/Preferences.jsx'

const App = () => {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Pleasant Walk Finder</h1>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<KeyEntry />} />
          <Route path="/main" element={<WalkFinder />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="*" element={<h2>404 - Page Not Found</h2>} />
        </Routes>
      </main>
    </div>
  );
};

export default App;