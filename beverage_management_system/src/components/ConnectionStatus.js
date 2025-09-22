import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ConnectionStatus.css';

const ConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const checkConnection = async () => {
    try {
      setIsChecking(true);
      // Try to access the health check endpoint that doesn't require authentication
      await api.get('/core/health/', { timeout: 5000 });
      // If we get here, server is connected
      setIsConnected(true);
    } catch (error) {
      // Check if it's a connection error vs other errors
      if (error.code === 'ECONNREFUSED' || 
          error.message.includes('Network Error') || 
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('Failed to fetch') ||
          error.message.includes('Connection refused')) {
        setIsConnected(false);
      } else if (error.response && error.response.status) {
        // If we get a response with a status code, server is connected
        setIsConnected(true);
      } else {
        // For any other error, assume disconnected
        setIsConnected(false);
      }
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="connection-status">
      <div 
        className={`status-dot ${isConnected ? 'connected' : 'disconnected'} ${isChecking ? 'checking' : ''}`}
        title={isChecking ? 'Checking connection...' : (isConnected ? 'Server connected' : 'Server disconnected')}
      />
      <span className="status-text">
        {isChecking ? 'Checking...' : (isConnected ? 'Connected' : 'Disconnected')}
      </span>
    </div>
  );
};

export default ConnectionStatus;
