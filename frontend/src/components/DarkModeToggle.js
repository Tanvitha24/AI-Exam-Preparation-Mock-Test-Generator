import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { FaMoon, FaSun } from 'react-icons/fa';

const DarkModeToggle = () => {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.body.setAttribute('data-bs-theme', 'dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Update localStorage
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light');
    
    // Update body attribute for Bootstrap 5 dark mode
    document.body.setAttribute('data-bs-theme', newDarkMode ? 'dark' : 'light');
  };

  return (
    <Button 
      variant={darkMode ? 'light' : 'dark'} 
      size="sm" 
      onClick={toggleDarkMode}
      className="d-flex align-items-center"
      title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {darkMode ? <FaSun className="me-1" /> : <FaMoon className="me-1" />}
      {darkMode ? 'Light' : 'Dark'}
    </Button>
  );
};

export default DarkModeToggle;