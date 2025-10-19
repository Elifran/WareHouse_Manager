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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navbarRef = useRef(null);

  // Detect mobile and adjust initial state
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      // Auto-collapse on mobile by default
      if (mobile) {
        setIsCollapsed(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleCollapse = () => {
    // Don't allow collapse toggle on mobile - use hamburger menu instead
    if (!isMobile) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const toggleDropdown = (category) => {
    setActiveDropdown(activeDropdown === category ? null : category);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (navbarRef.current && !navbarRef.current.contains(event.target)) {
        setActiveDropdown(null);
        if (isMobile) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile]);

  // Close menu when route changes
  useEffect(() => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }, [navigate, isMobile]);

  const navigationItems = [
    { name: t('navigation.purchase_orders'), path: '/purchase-orders', icon: '📋' },
    { name: t('navigation.inventory'), path: '/inventory', icon: '📦' },
    { name: t('navigation.suppliers'), path: '/suppliers', icon: '🏢' }
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isMobile && isMenuOpen && (
        <div 
          className="navbar-overlay"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
      
      <nav 
        className={`navbar ${isCollapsed ? 'collapsed' : ''} ${isMobile ? 'mobile' : ''} ${isMenuOpen ? 'menu-open' : ''}`} 
        ref={navbarRef}
      >
        <div className="navbar-container">
          {isAuthenticated ? (
            <>
              <div className="navbar-header">
                <div className="navbar-header-content">
                  <Link to="/" className="navbar-brand" onClick={() => isMobile && setIsMenuOpen(false)}>
                    {(!isCollapsed || isMobile) && <h1>{t('app.title')}</h1>}
                    {isCollapsed && !isMobile && <div className="brand-icon">📊</div>}
                  </Link>
                  
                  <div className="navbar-controls">
                    {!isMobile && (
                      <>
                        <LanguageSelector />
                        <button 
                          className="navbar-toggle"
                          onClick={toggleCollapse}
                          aria-label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                          title={isCollapsed ? "Expand navigation" : "Collapse navigation"}
                        >
                          {isCollapsed ? '→' : '←'}
                        </button>
                      </>
                    )}
                    
                    {isMobile && (
                      <button 
                        className="navbar-hamburger"
                        onClick={toggleMenu}
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                      >
                        <span></span>
                        <span></span>
                        <span></span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="navbar-content">
                <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
                  {navigationItems.map((item, index) => (
                    <Link 
                      key={index}
                      to={item.path} 
                      className="navbar-link"
                      onClick={() => setIsMenuOpen(false)}
                      title={isCollapsed && !isMobile ? item.name : ''}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {(!isCollapsed || isMobile) && <span className="nav-text">{item.name}</span>}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="navbar-footer">
                {(!isCollapsed || isMobile) ? (
                  <div className="navbar-user">
                    <div className="user-info">
                      <span className="user-name">{user?.username}</span>
                      <span className="user-role">{user?.role}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="small" 
                      onClick={handleLogout}
                      className="logout-button"
                    >
                      {t('navigation.logout')}
                    </Button>
                  </div>
                ) : (
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
    </>
  );
};

export default Navbar;