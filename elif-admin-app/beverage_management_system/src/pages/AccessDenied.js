import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AccessDenied.css';

const AccessDenied = () => {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="access-denied-container">
      <div className="access-denied-card">
        <div className="access-denied-icon">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h1>Access Denied</h1>
        <p>
          You do not have permission to access this application. 
          This application is restricted to managers and administrators only.
        </p>
        <button onClick={handleLogout} className="access-denied-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default AccessDenied;

