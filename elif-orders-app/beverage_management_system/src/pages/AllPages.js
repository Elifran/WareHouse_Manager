import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './AllPages.css';

const AllPages = () => {
  const { t } = useTranslation();

  // App subdomain mappings
  const appDomains = {
    'elif-orders-app': 'orders.elif',
    'elif-sales-app': 'sales.elif',
    'elif-admin-app': 'admin.elif'
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
    return 'elif-orders-app'; // Current app
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
  
  // Construct URL for other apps using subdomains
  const getOtherAppUrl = (appName) => {
    const protocol = window.location.protocol;
    const domain = appDomains[appName];
    return `${protocol}//${domain}`;
  };

  // Other apps links
  const otherApps = [
    { 
      name: 'Admin App', 
      url: getOtherAppUrl('elif-admin-app'), 
      icon: '⚙️',
      description: 'Manage inventory, users, system settings, and more'
    },
    { 
      name: 'Sales App', 
      url: getOtherAppUrl('elif-sales-app'), 
      icon: '🛒',
      description: 'Point of sale, sales management, and reports'
    }
  ];

  return (
    <div className="all-pages">
      <div className="all-pages-header">
        <h1>{t('all_pages.title') || 'All Pages'}</h1>
        <p>{t('all_pages.subtitle') || 'Access other applications'}</p>
      </div>

      <div className="all-pages-content">
        <div className="pages-grid">
          {otherApps.map((app, appIndex) => (
            <div key={appIndex} className="page-card">
              <div className="page-card-header">
                <span className="page-icon">{app.icon}</span>
                <h3>{app.name}</h3>
              </div>
              <div className="page-card-body">
                <p>{app.description}</p>
              </div>
              <div className="page-card-footer">
                <a href={app.url} className="page-link">
                  {t('all_pages.access_app') || 'Access App'}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AllPages;

