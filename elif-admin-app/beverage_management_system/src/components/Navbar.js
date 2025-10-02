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
  const [activeDropdown, setActiveDropdown] = useState(null);
  const navbarRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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

  // Admin App - Only admin management navigation
  const navigationItems = [
    { name: t('navigation.inventory'), path: '/inventory', icon: '📦' },
    { name: t('navigation.purchase_orders'), path: '/purchase-orders', icon: '📋' },
    { name: t('navigation.suppliers'), path: '/suppliers', icon: '🏢' },
    { name: t('navigation.users'), path: '/users', icon: '👥', adminOnly: true },
    { name: t('navigation.tax_management'), path: '/tax-management', icon: '📊', adminOnly: true },
    { name: t('navigation.system_management'), path: '/system-management', icon: '🔧', adminOnly: true },
    { name: t('navigation.stock_movement'), path: '/stock-movement', icon: '📦', adminOnly: true },
    { name: t('navigation.all_pages'), path: '/all-pages', icon: '🔗', adminOnly: true }
  ];

  return (
    <nav className="navbar" ref={navbarRef}>
      <div className="navbar-container">
        {isAuthenticated ? (
          <>
            <div className="navbar-left">
              <LanguageSelector />
            </div>
            
            <div className="navbar-center">
              <Link to="/" className="navbar-brand">
                <h1>{t('app.title')}</h1>
              </Link>
              <div className={`navbar-menu ${isMenuOpen ? 'active' : ''}`}>
                {navigationItems.map((item, index) => {
                  // Check if user has permission for this item
                  if (item.adminOnly && !(user?.role === 'admin' || user?.role === 'manager')) {
                    return null;
                  }
                  
                  return (
                    <Link 
                      key={index}
                      to={item.path} 
                      className="navbar-link"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="navbar-right">
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

              <button 
                className="navbar-toggle"
                onClick={toggleMenu}
                aria-label={t('app.toggle_menu')}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
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
