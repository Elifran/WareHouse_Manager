import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import LanguageSelector from './LanguageSelector';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated, isSales } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navbarRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleDropdown = (category) => {
    setActiveDropdown(activeDropdown === category ? null : category);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Orders App - Order management navigation
  const navigationItems = [
    { name: t('navigation.purchase_orders'), path: '/purchase-orders', icon: '📋' },
    { name: t('navigation.inventory'), path: '/inventory', icon: '📦' },
    { name: t('navigation.suppliers'), path: '/suppliers', icon: '🏢' }
  ];

  return (
    <nav className={`navbar ${isCollapsed ? 'collapsed' : ''}`} ref={navbarRef}>
      <div className="navbar-container">
        {isAuthenticated ? (
          <>
            <div className="navbar-header">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Link to="/" className="navbar-brand">
                  {!isCollapsed && <h1>{t('app.title')}</h1>}
                </Link>
                <button 
                  className="navbar-toggle"
                  onClick={toggleCollapse}
                  aria-label="Toggle navigation"
                  title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                >
                  {isCollapsed ? '→' : '←'}
                </button>
              </div>
              {!isCollapsed && <LanguageSelector />}
            </div>
            
            <div className="navbar-content">
              <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
                {navigationItems.map((item, index) => (
                  <Link 
                    key={index}
                    to={item.path} 
                    className="navbar-link"
                    onClick={() => setIsMenuOpen(false)}
                    title={isCollapsed ? item.name : ''}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    {!isCollapsed && item.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="navbar-footer">
              {!isCollapsed && (
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
                    {t('navigation.logout')}
                  </Button>
                </div>
              )}
              {isCollapsed && (
                <button 
                  className="logout-icon"
                  onClick={handleLogout}
                  title="Logout"
                >
                  🚪
                </button>
              )}
            </div>
          </>
        ) : (
          <Link to="/" className="navbar-brand">
            <h1>{t('app.title')}</h1>
          </Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
