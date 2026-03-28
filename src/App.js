import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing   from './pages/Landing';
import Dashboard from './pages/Dashboard';
import './App.css';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('cf-theme') ?? 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cf-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                  element={<Landing   theme={theme} onThemeToggle={toggleTheme} />} />
        <Route path="/dashboard/:ticker" element={<Dashboard theme={theme} onThemeToggle={toggleTheme} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;