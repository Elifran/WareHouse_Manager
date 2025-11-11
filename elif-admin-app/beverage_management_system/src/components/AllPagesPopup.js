import React from 'react';
import { useTranslation } from 'react-i18next';
import './AllPagesPopup.css';

const AllPagesPopup = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  // App port mappings
  const appPorts = {
    'elif-orders-app': 3000,
    'elif-sales-app': 3001,
    'elif-admin-app': 3002
  };

  // Get current app based on port or path
  const getCurrentApp = () => {
    const currentPort = parseInt(window.location.port);
    const currentHostname = window.location.hostname;
    
    // Check by port first (most reliable)
    if (currentPort === 3000) return 'elif-orders-app';
    if (currentPort === 3001) return 'elif-sales-app';
    if (currentPort === 3002) return 'elif-admin-app';
    
    // Fallback: check by path
    const path = window.location.pathname;
    const segments = path.split('/').filter(seg => seg);
    const appNames = ['elif-admin-app', 'elif-orders-app', 'elif-sales-app'];
    const appSegment = segments.find(seg => appNames.includes(seg));
    if (appSegment) {
      return appSegment;
    }
    
    // Default based on common ports
    return 'elif-admin-app'; // Current app
  };

  // Get base path dynamically from current location
  const getBasePath = () => {
    const path = window.location.pathname;
    const segments = path.split('/').filter(seg => seg);
    const appNames = ['elif-admin-app', 'elif-orders-app', 'elif-sales-app'];
    const appSegment = segments.find(seg => appNames.includes(seg));
    if (appSegment) {
      return `/${appSegment}`;
    }
    return '';
  };

  const currentApp = getCurrentApp();
  const basePath = getBasePath();
  const currentHostname = window.location.hostname;
  
  // Construct URL for other apps with correct port
  const getOtherAppUrl = (appName) => {
    const targetPort = appPorts[appName];
    const hostname = currentHostname || 'localhost';
    
    // Construct URL with port
    const protocol = window.location.protocol;
    return `${protocol}//${hostname}:${targetPort}`;
  };

  // Other apps links
  const otherApps = [
    { 
      name: 'Orders App', 
      url: getOtherAppUrl('elif-orders-app'), 
      icon: '📋',
      description: 'Manage purchase orders, inventory, and suppliers'
    },
    { 
      name: 'Sales App', 
      url: getOtherAppUrl('elif-sales-app'), 
      icon: '🛒',
      description: 'Point of sale, sales management, and reports'
    }
  ];

  return (
    <div className="all-pages-popup-overlay" onClick={onClose}>
      <div className="all-pages-popup-content" onClick={(e) => e.stopPropagation()}>
        <div className="all-pages-popup-header">
          <h2>{t('all_pages.title') || 'All Applications'}</h2>
          <button className="all-pages-popup-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="all-pages-popup-body">
          <p className="all-pages-popup-subtitle">
            {t('all_pages.subtitle') || 'Access other applications'}
          </p>
          <div className="all-pages-popup-grid">
            {otherApps.map((app, appIndex) => (
              <div key={appIndex} className="all-pages-popup-card">
                <div className="all-pages-popup-card-header">
                  <span className="all-pages-popup-icon">{app.icon}</span>
                  <h3>{app.name}</h3>
                </div>
                <div className="all-pages-popup-card-body">
                  <p>{app.description}</p>
                </div>
                <div className="all-pages-popup-card-footer">
                  <a href={app.url} className="all-pages-popup-link" onClick={onClose}>
                    {t('all_pages.access_app') || 'Access App'}
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllPagesPopup;

