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

  const navigationCategories = {
    orders: {
      title: t('navigation.orders'),
      icon: '🛒',
      items: [
        { name: t('navigation.pos'), path: '/pos', icon: '🛒' },
        { name: t('navigation.sales_management'), path: '/sales-management', icon: '📊' },
        { name: t('navigation.pending_sales'), path: '/pending-sales', icon: '⏳' },
        { name: t('navigation.returns'), path: '/returns', icon: '↩️' }
      ]
    },
    sales: {
      title: t('navigation.sales'),
      icon: '📈',
      items: [
        { name: t('navigation.dashboard'), path: '/dashboard', icon: '🏠' },
        { name: t('navigation.reports'), path: '/reports', icon: '📊' },
        { name: t('navigation.analytics'), path: '/analytics', icon: '📈' }
      ]
    },
    admin: {
      title: t('navigation.admin'),
      icon: '⚙️',
      items: [
        { name: t('navigation.inventory'), path: '/inventory', icon: '📦' },
        { name: t('navigation.purchase_orders'), path: '/purchase-orders', icon: '📋' },
        { name: t('navigation.suppliers'), path: '/suppliers', icon: '🏢' },
        { name: t('navigation.users'), path: '/users', icon: '👥', adminOnly: true },
        { name: t('navigation.tax_management'), path: '/tax-management', icon: '📊', adminOnly: true },
        { name: t('navigation.system_management'), path: '/system-management', icon: '🔧', adminOnly: true },
        { name: t('navigation.stock_movement'), path: '/stock-movement', icon: '📦', adminOnly: true },
        { name: t('navigation.all_pages'), path: '/all-pages', icon: '🔗', adminOnly: true }
      ],
      salesHidden: true // Hide entire admin section for sales users
    }
  };

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
                {Object.entries(navigationCategories).map(([key, category]) => {
                  // Hide entire category for sales users if marked as salesHidden
                  if (isSales && category.salesHidden) {
                    return null;
                  }
                  
                  return (
                    <div key={key} className="navbar-dropdown">
                      <button 
                        className="navbar-dropdown-toggle"
                        onClick={() => toggleDropdown(key)}
                      >
                        <span className="nav-icon">{category.icon}</span>
                        {category.title}
                        <span className={`dropdown-arrow ${activeDropdown === key ? 'active' : ''}`}>▼</span>
                      </button>
                      
                      {activeDropdown === key && (
                        <div className="navbar-dropdown-menu">
                          {category.items.map((item, index) => {
                            // Check if user has permission for this item
                            if (item.adminOnly && !(user?.role === 'admin' || user?.role === 'manager')) {
                              return null;
                            }
                            if (item.adminOnly && item.name === 'Reports' && user?.role !== 'admin') {
                              return null;
                            }
                            
                            return (
                              <Link 
                                key={index}
                                to={item.path} 
                                className="navbar-dropdown-link"
                                onClick={() => setActiveDropdown(null)}
                              >
                                <span className="nav-icon">{item.icon}</span>
                                {item.name}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
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
