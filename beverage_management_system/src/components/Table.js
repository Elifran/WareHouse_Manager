import React from 'react';
import { useTranslation } from 'react-i18next';
import './Table.css';

const Table = ({ 
  data = [], 
  columns = [], 
  loading = false, 
  emptyMessage,
  className = '',
  onRowClick,
  ...props 
}) => {
  const { t } = useTranslation();
  const defaultEmptyMessage = emptyMessage || t('app.no_data_available');
  if (loading) {
    return (
      <div className="table-container">
        <div className="table-loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="table-container">
        <div className="table-empty">
          <span>{defaultEmptyMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className={`table ${className}`} {...props}>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th key={index} className="table-header">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIndex) => (
            <tr 
              key={rowIndex} 
              className={`table-row ${onRowClick ? 'clickable' : ''}`}
              onClick={() => onRowClick && onRowClick(row, rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td key={colIndex} className="table-cell">
                  {column.render 
                    ? column.render(row[column.key], row, rowIndex)
                    : row[column.key]
                  }
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
