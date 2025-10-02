// Helper functions for formatting and utilities

export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined) {
    return '0.00';
  }
  // Format as number with 2 decimal places and add MGA suffix
  return `${parseFloat(amount).toFixed(2)} MGA`;
};

export const formatDate = (dateString) => {
  if (!dateString) {
    return 'N/A';
  }
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) {
    return 'N/A';
  }
  try {
    return new Date(dateString).toLocaleString();
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid Date';
  }
};

export const formatNumber = (number, decimals = 2) => {
  if (number === null || number === undefined) {
    return '0';
  }
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};

export const getStatusBadge = (status) => {
  const statusClasses = {
    pending: 'status-pending',
    completed: 'status-completed',
    cancelled: 'status-cancelled',
    refunded: 'status-refunded'
  };
  return statusClasses[status] || 'status-unknown';
};

export const getStatusText = (status) => {
  const statusTexts = {
    pending: 'Pending',
    completed: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
  };
  return statusTexts[status] || 'Unknown';
};
