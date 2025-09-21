import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import Table from '../components/Table';
import './PrinterSettings.css';

const PrinterSettings = () => {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'network', // network, local, usb
    ip_address: '',
    port: '9100',
    model: '',
    location: '',
    is_default: false,
    is_active: true
  });
  const [availablePrinters, setAvailablePrinters] = useState([]);

  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchPrinters();
    }
  }, [user]);

  const fetchPrinters = async () => {
    try {
      setLoading(true);
      // For now, we'll simulate printer data since we don't have a backend endpoint
      // In a real implementation, this would call an API endpoint
      const mockPrinters = [
        {
          id: 1,
          name: 'Office Printer HP',
          type: 'network',
          ip_address: '192.168.1.100',
          port: '9100',
          model: 'HP LaserJet Pro',
          location: 'Office',
          is_default: true,
          is_active: true,
          status: 'online',
          last_used: new Date().toISOString()
        },
        {
          id: 2,
          name: 'Receipt Printer',
          type: 'usb',
          ip_address: '',
          port: '',
          model: 'Epson TM-T20',
          location: 'Cash Register',
          is_default: false,
          is_active: true,
          status: 'online',
          last_used: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: 3,
          name: 'Warehouse Printer',
          type: 'network',
          ip_address: '192.168.1.101',
          port: '9100',
          model: 'Canon PIXMA',
          location: 'Warehouse',
          is_default: false,
          is_active: false,
          status: 'offline',
          last_used: new Date(Date.now() - 86400000).toISOString()
        }
      ];
      
      setPrinters(mockPrinters);
      setSelectedPrinter(mockPrinters.find(p => p.is_default) || mockPrinters[0]);
    } catch (err) {
      setError('Failed to fetch printers');
      console.error('Fetch printers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrinter = async () => {
    try {
      // In a real implementation, this would call an API endpoint
      const newPrinter = {
        id: Date.now(),
        ...formData,
        status: 'online',
        last_used: new Date().toISOString()
      };
      
      setPrinters(prev => [...prev, newPrinter]);
      setShowAddModal(false);
      setFormData({
        name: '',
        type: 'network',
        ip_address: '',
        port: '9100',
        model: '',
        location: '',
        is_default: false,
        is_active: true
      });
    } catch (err) {
      setError('Failed to add printer');
      console.error('Add printer error:', err);
    }
  };

  const handleAddSystemPrinter = (systemPrinter) => {
    const newPrinter = {
      id: Date.now(),
      name: systemPrinter.name,
      type: systemPrinter.type,
      ip_address: systemPrinter.ip_address || '',
      port: systemPrinter.port || '9100',
      model: systemPrinter.model,
      location: systemPrinter.location,
      is_default: false,
      is_active: true,
      status: 'online',
      last_used: new Date().toISOString()
    };
    
    setPrinters(prev => [...prev, newPrinter]);
    
    // Remove from available printers
    setAvailablePrinters(prev => prev.filter(p => p.name !== systemPrinter.name));
    
    alert(`Added ${systemPrinter.name} to your printer list`);
  };

  const handleUpdatePrinter = async (printerId, updates) => {
    try {
      setPrinters(prev => prev.map(printer => 
        printer.id === printerId ? { ...printer, ...updates } : printer
      ));
    } catch (err) {
      setError('Failed to update printer');
      console.error('Update printer error:', err);
    }
  };

  const handleDeletePrinter = async (printerId) => {
    if (window.confirm('Are you sure you want to delete this printer?')) {
      try {
        setPrinters(prev => prev.filter(printer => printer.id !== printerId));
        if (selectedPrinter && selectedPrinter.id === printerId) {
          setSelectedPrinter(printers.find(p => p.id !== printerId) || null);
        }
      } catch (err) {
        setError('Failed to delete printer');
        console.error('Delete printer error:', err);
      }
    }
  };

  const handleTestPrint = async (printer) => {
    try {
      // Create a test print document
      const testContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Printer Test</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin: 20px 0; }
            .success { color: green; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Printer Test Document</h1>
          </div>
          <div class="info">
            <p><strong>Printer:</strong> ${printer.name}</p>
            <p><strong>Type:</strong> ${printer.type}</p>
            <p><strong>Model:</strong> ${printer.model}</p>
            <p><strong>Location:</strong> ${printer.location}</p>
            <p><strong>Test Date:</strong> ${new Date().toLocaleString()}</p>
          </div>
          <div class="success">
            <p>✅ Printer test successful!</p>
            <p>This document was sent to: ${printer.name}</p>
          </div>
        </body>
        </html>
      `;
      
      const printWindow = window.open('', '_blank', 'width=600,height=400');
      printWindow.document.write(testContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      };
      
      // Update last used time
      handleUpdatePrinter(printer.id, { last_used: new Date().toISOString() });
      
    } catch (err) {
      setError('Failed to test print');
      console.error('Test print error:', err);
    }
  };

  const detectSystemPrinters = async () => {
    try {
      // Use the Web API to detect available printers
      if ('navigator' in window && 'serviceWorker' in navigator) {
        // Try to use the Web Printing API if available
        try {
          await navigator.serviceWorker.ready;
          // This is a placeholder - actual implementation would depend on browser support
          console.log('Web Printing API available');
        } catch (e) {
          console.log('Web Printing API not available');
        }
      }
      
      // For now, we'll simulate system printer detection
      // In a real implementation, this would use system APIs or backend services
      const systemPrinters = [
        {
          name: 'Microsoft Print to PDF',
          type: 'local',
          model: 'PDF Printer',
          location: 'Local System',
          is_system: true
        },
        {
          name: 'HP LaserJet Pro (Default)',
          type: 'local',
          model: 'HP LaserJet Pro',
          location: 'Local System',
          is_system: true
        },
        {
          name: 'Canon PIXMA G3110',
          type: 'usb',
          model: 'Canon PIXMA G3110',
          location: 'USB Port',
          is_system: true
        },
        {
          name: 'EPSON L3150',
          type: 'network',
          model: 'EPSON L3150',
          ip_address: '192.168.1.150',
          port: '9100',
          location: 'Network',
          is_system: true
        }
      ];
      
      setAvailablePrinters(systemPrinters);
      
      // Also try to detect network printers
      await detectNetworkPrinters();
      
    } catch (err) {
      console.error('System printer detection error:', err);
      setError('Failed to detect system printers');
    }
  };

  const detectNetworkPrinters = async () => {
    try {
      // Simulate network printer detection
      const networkPrinters = [
        {
          name: 'Office Printer HP',
          type: 'network',
          model: 'HP LaserJet Pro',
          ip_address: '192.168.1.100',
          port: '9100',
          location: 'Office Network',
          is_system: true
        },
        {
          name: 'Reception Canon',
          type: 'network',
          model: 'Canon PIXMA',
          ip_address: '192.168.1.101',
          port: '9100',
          location: 'Reception Network',
          is_system: true
        }
      ];
      
      setAvailablePrinters(prev => [...prev, ...networkPrinters]);
    } catch (err) {
      console.error('Network printer detection error:', err);
    }
  };

  const scanForPrinters = async () => {
    try {
      setLoading(true);
      await detectSystemPrinters();
      alert(`Found ${availablePrinters.length} available printer(s) on the system`);
    } catch (err) {
      setError('Failed to scan for printers');
      console.error('Scan printers error:', err);
    } finally {
      setLoading(false);
    }
  };

  const printerColumns = [
    { key: 'name', label: 'Name' },
    { key: 'type', label: 'Type' },
    { key: 'model', label: 'Model' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status', render: (value) => (
      <span className={`status-badge ${value}`}>{value}</span>
    )},
    { key: 'is_default', label: 'Default', render: (value) => value ? 'Yes' : 'No' },
    { key: 'is_active', label: 'Active', render: (value) => value ? 'Yes' : 'No' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_, item) => (
        <div className="action-buttons">
          <Button 
            size="small" 
            variant="outline" 
            onClick={() => handleTestPrint(item)}
          >
            Test
          </Button>
          <Button 
            size="small" 
            variant="outline" 
            onClick={() => {
              setFormData({
                name: item.name,
                type: item.type,
                ip_address: item.ip_address,
                port: item.port,
                model: item.model,
                location: item.location,
                is_default: item.is_default,
                is_active: item.is_active
              });
              setShowAddModal(true);
            }}
          >
            Edit
          </Button>
          <Button 
            size="small" 
            variant="danger" 
            onClick={() => handleDeletePrinter(item.id)}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  if (user?.role !== 'admin') {
    return (
      <div className="printer-settings">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You don't have permission to access printer settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="printer-settings">
      <div className="page-header">
        <h1>Printer Settings</h1>
        <p>Manage network and local printers for the system</p>
      </div>

      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <div className="printer-controls">
        <div className="control-group">
          <Button onClick={() => {
            setShowAddModal(true);
            detectSystemPrinters();
          }}>
            Add Printer
          </Button>
          <Button variant="outline" onClick={scanForPrinters} disabled={loading}>
            {loading ? 'Scanning...' : 'Scan Network'}
          </Button>
        </div>
        
        <div className="selected-printer">
          <label>Default Printer:</label>
          <select 
            value={selectedPrinter?.id || ''} 
            onChange={(e) => {
              const printer = printers.find(p => p.id === parseInt(e.target.value));
              setSelectedPrinter(printer);
              if (printer) {
                handleUpdatePrinter(printer.id, { is_default: true });
                // Remove default from other printers
                printers.forEach(p => {
                  if (p.id !== printer.id && p.is_default) {
                    handleUpdatePrinter(p.id, { is_default: false });
                  }
                });
              }
            }}
          >
            <option value="">Select Default Printer</option>
            {printers.filter(p => p.is_active).map(printer => (
              <option key={printer.id} value={printer.id}>
                {printer.name} ({printer.location})
              </option>
            ))}
          </select>
        </div>
      </div>

      <Table
        data={printers}
        columns={printerColumns}
        loading={loading}
        emptyMessage="No printers found"
      />

      {/* Add/Edit Printer Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Add/Edit Printer</h3>
              <button onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <div className="modal-body">
              {/* Available System Printers Section */}
              {availablePrinters.length > 0 && (
                <div className="available-printers-section">
                  <h4>Available System Printers</h4>
                  <div className="available-printers-list">
                    {availablePrinters.map((printer, index) => (
                      <div key={index} className="available-printer-item">
                        <div className="printer-info">
                          <strong>{printer.name}</strong>
                          <span className="printer-type">{printer.type.toUpperCase()}</span>
                          <span className="printer-model">{printer.model}</span>
                          <span className="printer-location">{printer.location}</span>
                          {printer.ip_address && (
                            <span className="printer-ip">{printer.ip_address}:{printer.port}</span>
                          )}
                        </div>
                        <Button 
                          size="small" 
                          onClick={() => handleAddSystemPrinter(printer)}
                        >
                          Add to List
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-divider">
                <span>Or Add Manually</span>
              </div>

              <div className="form-group">
                <label>Printer Name:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter printer name"
                />
              </div>
              
              <div className="form-group">
                <label>Type:</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                >
                  <option value="network">Network Printer</option>
                  <option value="usb">USB Printer</option>
                  <option value="local">Local Printer</option>
                </select>
              </div>
              
              {formData.type === 'network' && (
                <>
                  <div className="form-group">
                    <label>IP Address:</label>
                    <input
                      type="text"
                      value={formData.ip_address}
                      onChange={(e) => setFormData({...formData, ip_address: e.target.value})}
                      placeholder="192.168.1.100"
                    />
                  </div>
                  <div className="form-group">
                    <label>Port:</label>
                    <input
                      type="text"
                      value={formData.port}
                      onChange={(e) => setFormData({...formData, port: e.target.value})}
                      placeholder="9100"
                    />
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label>Model:</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="Enter printer model"
                />
              </div>
              
              <div className="form-group">
                <label>Location:</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Enter printer location"
                />
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({...formData, is_default: e.target.checked})}
                  />
                  Set as default printer
                </label>
              </div>
              
              <div className="form-group checkbox-group">
                <label>
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                  />
                  Active
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="outline" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddPrinter}>
                Save Printer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrinterSettings;
