import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import './AllPages.css';

const AllPages = () => {
  const { t } = useTranslation();

  const allPages = [
    // Orders App Pages
    {
      category: t('navigation.orders'),
      icon: '🛒',
      pages: [
        { name: t('navigation.pos'), path: '/pos', description: t('all_pages.pos_description') },
        { name: t('navigation.sales_management'), path: '/sales-management', description: t('all_pages.sales_management_description') },
        { name: t('navigation.pending_sales'), path: '/pending-sales', description: t('all_pages.pending_sales_description') },
        { name: t('navigation.returns'), path: '/returns', description: t('all_pages.returns_description') }
      ]
    },
    // Sales App Pages
    {
      category: t('navigation.sales'),
      icon: '📈',
      pages: [
        { name: t('navigation.dashboard'), path: '/dashboard', description: t('all_pages.dashboard_description') },
        { name: t('navigation.reports'), path: '/reports', description: t('all_pages.reports_description') },
        { name: t('navigation.analytics'), path: '/analytics', description: t('all_pages.analytics_description') }
      ]
    },
    // Admin App Pages
    {
      category: t('navigation.admin'),
      icon: '⚙️',
      pages: [
        { name: t('navigation.inventory'), path: '/inventory', description: t('all_pages.inventory_description') },
        { name: t('navigation.purchase_orders'), path: '/purchase-orders', description: t('all_pages.purchase_orders_description') },
        { name: t('navigation.suppliers'), path: '/suppliers', description: t('all_pages.suppliers_description') },
        { name: t('navigation.users'), path: '/users', description: t('all_pages.users_description') },
        { name: t('navigation.tax_management'), path: '/tax-management', description: t('all_pages.tax_management_description') },
        { name: t('navigation.system_management'), path: '/system-management', description: t('all_pages.system_management_description') },
        { name: t('navigation.stock_movement'), path: '/stock-movement', description: t('all_pages.stock_movement_description') }
      ]
    }
  ];

  return (
    <div className="all-pages">
      <div className="all-pages-header">
        <h1>{t('all_pages.title')}</h1>
        <p>{t('all_pages.subtitle')}</p>
      </div>

      <div className="all-pages-content">
        {allPages.map((category, categoryIndex) => (
          <div key={categoryIndex} className="page-category">
            <div className="category-header">
              <span className="category-icon">{category.icon}</span>
              <h2>{category.category}</h2>
            </div>
            
            <div className="pages-grid">
              {category.pages.map((page, pageIndex) => (
                <div key={pageIndex} className="page-card">
                  <div className="page-card-header">
                    <h3>{page.name}</h3>
                  </div>
                  <div className="page-card-body">
                    <p>{page.description}</p>
                  </div>
                  <div className="page-card-footer">
                    <Link to={page.path} className="page-link">
                      {t('all_pages.access_page')}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="all-pages-footer">
        <div className="app-links">
          <h3>{t('all_pages.other_apps')}</h3>
          <div className="app-links-grid">
            <a href="/elif-orders-app" className="app-link orders-app">
              <span className="app-icon">🛒</span>
              <span className="app-name">ELIF Orders</span>
              <span className="app-description">{t('all_pages.orders_app_description')}</span>
            </a>
            <a href="/elif-sales-app" className="app-link sales-app">
              <span className="app-icon">📈</span>
              <span className="app-name">ELIF Sales</span>
              <span className="app-description">{t('all_pages.sales_app_description')}</span>
            </a>
            <a href="/elif-admin-app" className="app-link admin-app current">
              <span className="app-icon">⚙️</span>
              <span className="app-name">ELIF Admin</span>
              <span className="app-description">{t('all_pages.admin_app_description')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AllPages;
