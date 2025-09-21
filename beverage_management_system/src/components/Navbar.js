import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from './Button';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand">
          <h1>Beverage Manager</h1>
        </Link>

        {isAuthenticated && (
          <>
            <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
              <Link to="/dashboard" className="navbar-link">
                Dashboard
              </Link>
              <Link to="/inventory" className="navbar-link">
                Inventory
              </Link>
              <Link to="/pos" className="navbar-link">
                Point of Sale
              </Link>
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <>
                  <Link to="/users" className="navbar-link">
                    Users
                  </Link>
                  <Link to="/tax-management" className="navbar-link">
                    Tax Management
                  </Link>
                  <Link to="/sales-management" className="navbar-link">
                    Sales Management
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/reports" className="navbar-link">
                      Reports
                    </Link>
                  )}
                </>
              )}
            </div>

            <div className="navbar-user">
              <div className="user-info">
                <span className="user-name">{user?.username}</span>
                <span className="user-role">{user?.role}</span>
              </div>
              <Button 
                variant="outline" 
                size="small" 
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>

            <button 
              className="navbar-toggle"
              onClick={toggleMenu}
              aria-label="Toggle menu"
            >
              <span></span>
              <span></span>
              <span></span>
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
