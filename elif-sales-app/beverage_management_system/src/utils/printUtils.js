/**
 * Print utilities for thermal receipt printer compatibility
 * Supports 80mm and 58mm thermal printers with ESC/POS commands
 */

// ESC/POS Commands for thermal printers (Xprinter 80mm compatible)
export const ESC_POS_COMMANDS = {
  INITIALIZE: '\x1B\x40',           // Initialize printer
  CENTER: '\x1B\x61\x01',          // Center text
  LEFT_ALIGN: '\x1B\x61\x00',      // Left align text
  RIGHT_ALIGN: '\x1B\x61\x02',     // Right align text
  BOLD_ON: '\x1B\x45\x01',         // Bold on
  BOLD_OFF: '\x1B\x45\x00',        // Bold off
  DOUBLE_HEIGHT: '\x1B\x21\x10',   // Double height
  NORMAL_SIZE: '\x1B\x21\x00',     // Normal size
  CUT_PAPER: '\x1D\x56\x00',       // Cut paper
  FEED_LINE: '\x0A',               // Feed line
  FEED_LINES: (n) => `\x1B\x64${String.fromCharCode(n)}`, // Feed n lines
  UNDERLINE_ON: '\x1B\x2D\x01',    // Underline on
  UNDERLINE_OFF: '\x1B\x2D\x00',   // Underline off
  REVERSE_ON: '\x1D\x42\x01',      // Reverse on
  REVERSE_OFF: '\x1D\x42\x00',     // Reverse off
  // Xprinter specific commands
  XPRINTER_INIT: '\x1B\x40',       // Xprinter initialization
  XPRINTER_CUT: '\x1D\x56\x42\x00', // Xprinter cut paper
  XPRINTER_FEED: '\x1B\x64\x03',   // Xprinter feed 3 lines
  XPRINTER_BEEP: '\x1B\x42\x01\x01', // Xprinter beep
};

// Printer configurations
export const PRINTER_CONFIGS = {
  THERMAL_80MM: {
    width: '80mm',
    maxChars: 32,
    fontSize: 12,
    lineHeight: 1.2,
    margins: '5mm'
  },
  THERMAL_58MM: {
    width: '58mm',
    maxChars: 24,
    fontSize: 10,
    lineHeight: 1.1,
    margins: '3mm'
  },
  STANDARD_A4: {
    width: '210mm',
    maxChars: 80,
    fontSize: 14,
    lineHeight: 1.4,
    margins: '20mm'
  }
};

/**
 * Generate CSS for thermal printer compatibility
 * @param {string} printerType - Type of printer (THERMAL_80MM, THERMAL_58MM, STANDARD_A4)
 * @returns {string} CSS styles
 */
export const generateThermalPrinterCSS = (printerType = 'THERMAL_80MM') => {
  const config = PRINTER_CONFIGS[printerType];
  
  return `
    @media print {
      @page {
        size: ${config.width} auto;
        margin: ${config.margins};
      }
      
      body { 
        margin: 0; 
        font-size: ${config.fontSize}px;
        line-height: ${config.lineHeight};
        font-family: 'Courier New', monospace;
        max-width: ${config.width};
      }
      
      .header h1 { 
        font-size: ${config.fontSize + 6}px; 
        margin-bottom: 5px;
        text-align: center;
      }
      
      .header .date, .header .print-info { 
        font-size: ${config.fontSize - 2}px; 
        text-align: center;
      }
      
      .info-section { 
        padding: 8px; 
        margin-bottom: 10px; 
        border: 1px solid #000;
      }
      
      .info-section h3 { 
        font-size: ${config.fontSize + 2}px; 
        margin-bottom: 5px;
        text-align: center;
        font-weight: bold;
      }
      
      .info-row { 
        margin-bottom: 3px; 
        font-size: ${config.fontSize - 1}px;
        display: flex;
        justify-content: space-between;
      }
      
      table { 
        width: 100%;
        font-size: ${config.fontSize - 2}px; 
        border-collapse: collapse;
      }
      
      th, td { 
        padding: 2px; 
        font-size: ${config.fontSize - 2}px;
        border: 1px solid #000;
        text-align: left;
      }
      
      th { 
        background-color: #f0f0f0;
        font-weight: bold;
        text-align: center;
      }
      
      .total-row { 
        font-weight: bold; 
        background-color: #e0e0e0; 
      }
      
      .footer { 
        font-size: ${config.fontSize - 3}px; 
        margin-top: 15px; 
        text-align: center;
        border-top: 1px solid #000;
        padding-top: 5px;
      }
      
      .thermal-printer-commands {
        display: block;
        font-family: monospace;
        font-size: 8px;
        color: #666;
        margin-top: 5px;
        text-align: center;
      }
      
      /* Hide elements not suitable for thermal printing */
      .no-print, .print-button, .button, .btn {
        display: none !important;
      }
    }
  `;
};

/**
 * Generate ESC/POS commands for thermal printer
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @returns {string} ESC/POS formatted string
 */
export const generateESCPOSCommands = (data, title) => {
  let commands = '';
  
  // Initialize printer
  commands += ESC_POS_COMMANDS.INITIALIZE;
  
  // Center and bold title
  commands += ESC_POS_COMMANDS.CENTER;
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += ESC_POS_COMMANDS.DOUBLE_HEIGHT;
  commands += title + '\n';
  commands += ESC_POS_COMMANDS.NORMAL_SIZE;
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += ESC_POS_COMMANDS.FEED_LINE;
  
  // Add separator line
  commands += '='.repeat(32) + '\n';
  commands += ESC_POS_COMMANDS.FEED_LINE;
  
  // Add document info
  commands += ESC_POS_COMMANDS.LEFT_ALIGN;
  commands += `Date: ${new Date().toLocaleDateString()}\n`;
  commands += `Time: ${new Date().toLocaleTimeString()}\n`;
  commands += `Print ID: ${data.print_id || 'N/A'}\n`;
  commands += ESC_POS_COMMANDS.FEED_LINE;
  
  // Add content based on type
  if (data.sale_number) {
    commands += `Sale: ${data.sale_number}\n`;
  }
  if (data.customer_name) {
    commands += `Customer: ${data.customer_name}\n`;
  }
  if (data.customer_phone) {
    commands += `Phone: ${data.customer_phone}\n`;
  }
  
  commands += ESC_POS_COMMANDS.FEED_LINE;
  commands += '-'.repeat(32) + '\n';
  
  // Add items if present
  if (data.items && Array.isArray(data.items)) {
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'ITEMS:\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    
    data.items.forEach(item => {
      commands += `${item.product_name || 'N/A'}\n`;
      commands += `  Qty: ${item.quantity || 0} ${item.unit_name || 'pcs'}\n`;
      commands += `  Price: ${parseFloat(item.unit_price || 0).toFixed(2)} MGA\n`;
      commands += `  Total: ${parseFloat(item.total_price || 0).toFixed(2)} MGA\n`;
      commands += '\n';
    });
  }
  
  // Add packaging items if present
  if (data.packaging_items && Array.isArray(data.packaging_items)) {
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'PACKAGING:\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    
    data.packaging_items.forEach(item => {
      commands += `${item.product_name || 'N/A'}\n`;
      commands += `  Qty: ${item.quantity || 0} ${item.unit_name || 'pcs'}\n`;
      commands += `  Price: ${parseFloat(item.unit_price || 0).toFixed(2)} MGA\n`;
      commands += `  Total: ${parseFloat(item.total_price || 0).toFixed(2)} MGA\n`;
      commands += `  Status: ${item.status || 'N/A'}\n`;
      commands += '\n';
    });
  }
  
  // Add totals
  commands += ESC_POS_COMMANDS.FEED_LINE;
  commands += '='.repeat(32) + '\n';
  commands += ESC_POS_COMMANDS.BOLD_ON;
  
  if (data.total_amount) {
    commands += `TOTAL: ${parseFloat(data.total_amount).toFixed(2)} MGA\n`;
  }
  if (data.packaging_total) {
    commands += `PACKAGING: ${parseFloat(data.packaging_total).toFixed(2)} MGA\n`;
  }
  if (data.paid_amount) {
    commands += `PAID: ${parseFloat(data.paid_amount).toFixed(2)} MGA\n`;
  }
  if (data.remaining_amount) {
    commands += `REMAINING: ${parseFloat(data.remaining_amount).toFixed(2)} MGA\n`;
  }
  
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += '='.repeat(32) + '\n';
  
  // Add footer
  commands += ESC_POS_COMMANDS.FEED_LINE;
  commands += 'Generated by ______ANTATSIMO______ System\n';
  commands += `User: ${data.user_name || 'System'}\n`;
  commands += `Print ID: ${data.print_id || 'N/A'}\n`;
  
  // Feed lines and cut paper
  commands += ESC_POS_COMMANDS.FEED_LINES(3);
  commands += ESC_POS_COMMANDS.CUT_PAPER;
  
  return commands;
};

/**
 * Detect printer type based on user agent or settings
 * @returns {string} Printer type
 */
export const detectPrinterType = () => {
  // Check if running in a thermal printer environment
  if (typeof window !== 'undefined') {
    const userAgent = window.navigator.userAgent.toLowerCase();
    
    // Check for Xprinter specific indicators
    if (userAgent.includes('xprinter') || userAgent.includes('thermal') || userAgent.includes('receipt')) {
      return 'THERMAL_80MM'; // Xprinter 80mm
    }
    
    // Enhanced mobile detection
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
                     (window.innerWidth <= 768) ||
                     ('ontouchstart' in window) ||
                     (navigator.maxTouchPoints > 0);
    
    // For mobile devices, still use 80mm for Xprinter compatibility
    if (isMobile) {
      return 'THERMAL_80MM'; // Force 80mm for Xprinter compatibility
    }
  }
  
  // Default to 80mm thermal printer (Xprinter standard)
  return 'THERMAL_80MM';
};

/**
 * Check if device supports modern printing APIs
 * @returns {boolean} True if modern printing is supported
 */
export const supportsModernPrinting = () => {
  if (typeof window === 'undefined') return false;
  
  // Check for modern printing APIs
  return !!(window.navigator && (
    window.navigator.share ||
    window.print ||
    (window.matchMedia && window.matchMedia('print'))
  ));
};

/**
 * Check if device is mobile
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) ||
         (window.innerWidth <= 768) ||
         ('ontouchstart' in window) ||
         (navigator.maxTouchPoints > 0);
};

/**
 * Format text for thermal printer (truncate if too long)
 * @param {string} text - Text to format
 * @param {number} maxLength - Maximum length
 * @returns {string} Formatted text
 */
export const formatForThermalPrinter = (text, maxLength = 32) => {
  if (!text) return '';
  
  // Remove HTML tags
  const cleanText = text.replace(/<[^>]*>/g, '');
  
  // Truncate if too long
  if (cleanText.length > maxLength) {
    return cleanText.substring(0, maxLength - 3) + '...';
  }
  
  return cleanText;
};

/**
 * Create a print-ready document with thermal printer compatibility
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @param {string} type - Document type
 * @param {Function} t - Translation function
 * @param {string} printerType - Printer type
 * @returns {string} HTML content
 */
export const createThermalPrintDocument = (data, title, type, t, printerType = null) => {
  const detectedType = printerType || detectPrinterType();
  const css = generateThermalPrinterCSS(detectedType);
  const escPosCommands = generateESCPOSCommands(data, title);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        ${css}
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${formatForThermalPrinter(title, 32)}</h1>
        <div class="date">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
        <div class="print-info">ID: ${data.print_id || 'N/A'}</div>
      </div>
      
      <div class="thermal-printer-commands">
        <pre>${escPosCommands}</pre>
      </div>
      
      <div class="footer">
        <p>______ANTATSIMO______ System</p>
        <p>Print ID: ${data.print_id || 'N/A'}</p>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate ESC/POS commands for direct printer communication
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @returns {string} ESC/POS formatted string
 */
export const generateESCPOSForReceiptApp = (data, title) => {
  try {
    // Validate inputs
    if (!data || !title) {
      console.error('Invalid data or title provided to generateESCPOSForReceiptApp');
      return '';
    }
    
    let commands = '';
    
    // Initialize printer
    commands += ESC_POS_COMMANDS.XPRINTER_INIT;
  
  // Center and bold title
  commands += ESC_POS_COMMANDS.CENTER;
  commands += ESC_POS_COMMANDS.BOLD_ON;
  commands += ESC_POS_COMMANDS.DOUBLE_HEIGHT;
  commands += title + '\n';
  commands += ESC_POS_COMMANDS.NORMAL_SIZE;
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += ESC_POS_COMMANDS.FEED_LINE;
  
  // Add separator line
  commands += '='.repeat(32) + '\n';
  commands += ESC_POS_COMMANDS.FEED_LINE;
  
  // Add document info
  commands += ESC_POS_COMMANDS.LEFT_ALIGN;
  commands += `Date: ${new Date().toLocaleDateString()}\n`;
  commands += `Time: ${new Date().toLocaleTimeString()}\n`;
  commands += `Print ID: ${data.print_id || 'N/A'}\n`;
  commands += ESC_POS_COMMANDS.FEED_LINE;
  
  // Add sale info
  if (data.sale_number) {
    commands += `Sale: ${data.sale_number}\n`;
  }
  if (data.customer_name) {
    commands += `Customer: ${data.customer_name}\n`;
  }
  if (data.customer_phone) {
    commands += `Phone: ${data.customer_phone}\n`;
  }
  
  commands += ESC_POS_COMMANDS.FEED_LINE;
  commands += '-'.repeat(32) + '\n';
  
  // Add items
  if (data.items && Array.isArray(data.items)) {
    commands += ESC_POS_COMMANDS.BOLD_ON;
    commands += 'ITEMS:\n';
    commands += ESC_POS_COMMANDS.BOLD_OFF;
    
    data.items.forEach(item => {
      commands += `${(item.product_name || 'N/A').substring(0, 25)}\n`;
      commands += `  Qty: ${item.quantity_display || item.quantity || 0} x ${parseFloat(item.unit_price || 0).toFixed(2)}\n`;
      commands += `  Total: ${parseFloat(item.total_price || 0).toFixed(2)} MGA\n`;
      commands += '\n';
    });
  }
  
  // Add totals
  commands += ESC_POS_COMMANDS.FEED_LINE;
  commands += '='.repeat(32) + '\n';
  commands += ESC_POS_COMMANDS.BOLD_ON;
  
  if (data.total_amount) {
    commands += `TOTAL: ${parseFloat(data.total_amount).toFixed(2)} MGA\n`;
  }
  if (data.paid_amount) {
    commands += `PAID: ${parseFloat(data.paid_amount).toFixed(2)} MGA\n`;
  }
  if (data.remaining_amount && data.remaining_amount > 0) {
    commands += `DUE: ${parseFloat(data.remaining_amount).toFixed(2)} MGA\n`;
  }
  
  commands += ESC_POS_COMMANDS.BOLD_OFF;
  commands += '='.repeat(32) + '\n';
  
  // Add footer
  commands += ESC_POS_COMMANDS.FEED_LINE;
  commands += 'Thank you for your business!\n';
  commands += '______ANTATSIMO______ System\n';
  commands += `Print ID: ${data.print_id || 'N/A'}\n`;
  
  // Feed lines and cut paper
  commands += ESC_POS_COMMANDS.XPRINTER_FEED;
  commands += ESC_POS_COMMANDS.XPRINTER_CUT;
  
  return commands;
  } catch (error) {
    console.error('Error generating ESC/POS commands:', error);
    return '';
  }
};

/**
 * Create downloadable file for receipt printer apps
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @returns {string} File content for download
 */
export const createReceiptAppFile = (data, title) => {
  const escPosCommands = generateESCPOSForReceiptApp(data, title);
  
  // Create a simple translation function for the HTML content
  const simpleT = (key, fallback) => fallback || key;
  const htmlContent = generateXprinterPrintContent(data, title, 'sale', simpleT);
  
  // Create a combined file that works with receipt printer apps
  return `# Receipt Printer App File
# Generated: ${new Date().toISOString()}
# Title: ${title}

# ESC/POS Commands (for direct printer communication)
${escPosCommands}

# HTML Content (for preview and fallback printing)
${htmlContent}

# End of file`;
};

/**
 * Generate PDF content for receipt
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @returns {string} PDF-ready HTML content
 */
export const generatePDFContent = (data, title) => {
  const isMobile = isMobileDevice();
  const width = '80mm'; // Standard for Xprinter
  const fontSize = '12px';
  const maxChars = 32;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: ${fontSize};
          line-height: 1.2;
          color: #000;
          width: ${width};
          max-width: ${width};
          margin: 0 auto;
          padding: 2mm;
          background: white;
        }
        
        .receipt-header {
          text-align: center;
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dashed #000;
        }
        
        .company-name {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .document-title {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .receipt-date {
          font-size: 11px;
          color: #555;
        }
        
        .receipt-section {
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dotted #ccc;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 3px;
          text-transform: uppercase;
          background: #f0f0f0;
          padding: 1px 3px;
        }
        
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 11px;
        }
        
        .item-name {
          font-weight: bold;
          margin-bottom: 1px;
          word-wrap: break-word;
          max-width: 22ch;
        }
        
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #555;
        }
        
        .receipt-totals {
          margin: 6px 0;
          padding-top: 4px;
          border-top: 2px solid #000;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-weight: bold;
          font-size: 11px;
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px dashed #000;
          font-size: 10px;
          color: #666;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 1mm;
            width: ${width};
          }
          
          @page {
            size: ${width} auto;
            margin: 0;
          }
        }
        
        @media screen {
          body {
            border: 1px solid #ccc;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <div class="company-name">______ANTATSIMO______</div>
        <div class="document-title">${title.toUpperCase()}</div>
        <div class="receipt-date">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
      
      <div class="receipt-section">
        <div class="section-title">SALE INFO</div>
        <div class="receipt-row">
          <span>Sale No:</span>
          <span>${data.sale_number || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Status:</span>
          <span>${data.status || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Customer:</span>
          <span>${(data.customer_name || 'Walk-in Customer').substring(0, 22)}</span>
        </div>
        ${data.customer_phone ? `
          <div class="receipt-row">
            <span>Phone:</span>
            <span>${data.customer_phone}</span>
          </div>
        ` : ''}
        <div class="receipt-row">
          <span>Peyment Status:</span>
          <span>${data.payment_status}</span>
        </div>
      </div>
      
      <div class="receipt-section">
        <div class="section-title">ITEMS</div>
        ${data.items && Array.isArray(data.items) ? data.items.map(item => `
          <div class="item-name">${(item.product_name || 'N/A').substring(0, 22)}</div>
          <div class="item-details">
            <span>${item.quantity_display || item.quantity || 0} x ${parseFloat(item.unit_price || 0).toFixed(2)}</span>
            <span>${parseFloat(item.total_price || 0).toFixed(2)} MGA</span>
          </div>
        `).join('') : '<div class="no-data">No items found</div>'}
      </div>
      
      <div class="receipt-totals">
        <div class="total-row">
          <span>Total:</span>
          <span>${parseFloat(data.total_amount || 0).toFixed(2)} MGA</span>
        </div>
        <div class="total-row">
          <span>Paid:</span>
          <span>${parseFloat(data.paid_amount || 0).toFixed(2)} MGA</span>
        </div>
        ${data.payment_status === 'partial' ? `
          <div class="total-row">
            <span>Due:</span>
            <span>${parseFloat(data.remaining_amount || 0).toFixed(2)} MGA</span>
          </div>
        ` : ''}
      </div>
      
      <div class="receipt-footer">
        <div>Thank you for your business!</div>
        <div>Print ID: ${data.print_id || 'N/A'}</div>
        <div>Created by: ${(data.created_by_name || data.sold_by_name || 'N/A')}</div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Download PDF file for receipt printer apps
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @returns {boolean} Success status
 */
export const downloadReceiptFile = (data, title) => {
  try {
    // Validate inputs
    if (!data || !title) {
      console.error('Invalid data or title provided to downloadReceiptFile');
      return false;
    }
    
    const pdfContent = generatePDFContent(data, title);
    if (!pdfContent) {
      console.error('Failed to create PDF content');
      return false;
    }
    
    // Create a blob with HTML content that can be saved as PDF
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt_${data.sale_number || Date.now()}.html`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Failed to download receipt file:', error);
    return false;
  }
};

/**
 * Mobile-friendly print function with fallbacks
 * @param {string} printContent - HTML content to print
 * @param {string} title - Document title
 * @returns {Promise<boolean>} Success status
 */
export const mobilePrint = async (printContent, title = 'Document') => {
  try {
    // Method 1: Try Web Share API with file (modern mobile browsers)
    if (navigator.share && isMobileDevice()) {
      try {
        // Create a blob with the content
        const blob = new Blob([printContent], { type: 'text/html' });
        const file = new File([blob], `${title}.html`, { type: 'text/html' });
        
        await navigator.share({
          title: title,
          text: 'Print this receipt',
          files: [file]
        });
        
        return true;
      } catch (shareError) {
        console.log('Web Share API with file failed, trying other methods:', shareError);
      }
    }

    // Method 2: Try direct window.print() on current page
    if (window.print && !isMobileDevice()) {
      // Create a temporary element with the content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = printContent;
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.top = '-9999px';
      document.body.appendChild(tempDiv);
      
      // Replace body content temporarily
      const originalBody = document.body.innerHTML;
      document.body.innerHTML = printContent;
      
      // Print
      window.print();
      
      // Restore original content
      document.body.innerHTML = originalBody;
      document.body.removeChild(tempDiv);
      
      return true;
    }

    // Method 3: Try popup window (with better error handling)
    return await openPrintWindow(printContent, title);
    
  } catch (error) {
    console.error('All print methods failed:', error);
    return false;
  }
};

/**
 * Open print window with enhanced error handling
 * @param {string} printContent - HTML content to print
 * @param {string} title - Document title
 * @returns {Promise<boolean>} Success status
 */
export const openPrintWindow = (printContent, title = 'Document') => {
  return new Promise((resolve) => {
    try {
      // Enhanced window.open parameters for better mobile compatibility
      const windowFeatures = isMobileDevice() 
        ? 'width=400,height=600,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=no,status=no'
        : 'width=900,height=700,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=no,status=no';
      
      const printWindow = window.open('', '_blank', windowFeatures);
      
      if (!printWindow) {
        throw new Error('Popup blocked or window.open failed');
      }
      
      // Set window title
      printWindow.document.title = title;
      
      // Write content to window
      printWindow.document.write(printContent);
      printWindow.document.close();
      
      // Make sure window is visible and focused
      printWindow.focus();
      
      // Wait for content to load and show the window
      const showAndPrint = () => {
        try {
          // Ensure window is visible
          printWindow.focus();
          
          // Add a small delay to ensure content is rendered
          setTimeout(() => {
            try {
              // Show print dialog
              printWindow.print();
              
              // Keep window open longer for user interaction
              setTimeout(() => {
                if (!printWindow.closed) {
                  // Ask user if they want to close the window
                  if (window.confirm('Close the print preview window?')) {
                    printWindow.close();
                  }
                }
              }, 5000);
              
              resolve(true);
            } catch (printError) {
              console.error('Print failed:', printError);
              // Don't close window immediately, let user see the content
              resolve(false);
            }
          }, 500);
          
        } catch (error) {
          console.error('Error in showAndPrint:', error);
          resolve(false);
        }
      };
      
      // Check if content is loaded
      if (printWindow.document.readyState === 'complete') {
        showAndPrint();
      } else {
        printWindow.onload = showAndPrint;
      }
      
      // Fallback timeout - don't auto-close
      setTimeout(() => {
        if (!printWindow.closed) {
          console.log('Print window timeout - window remains open for user interaction');
        }
      }, 30000);
      
    } catch (error) {
      console.error('Failed to open print window:', error);
      resolve(false);
    }
  });
};

/**
 * Open print preview window (visible, doesn't auto-close)
 * @param {string} printContent - HTML content to print
 * @param {string} title - Document title
 * @returns {boolean} Success status
 */
export const openPrintPreview = (printContent, title = 'Document') => {
  try {
    // Create a larger window for better visibility
    const windowFeatures = isMobileDevice() 
      ? 'width=500,height=700,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=no,status=yes'
      : 'width=1000,height=800,scrollbars=yes,resizable=yes,toolbar=yes,menubar=yes,location=no,status=yes';
    
    const previewWindow = window.open('', '_blank', windowFeatures);
    
    if (!previewWindow) {
      throw new Error('Popup blocked or window.open failed');
    }
    
    // Set window title
    previewWindow.document.title = `${title} - Print Preview`;
    
    // Add print button and styling
    const enhancedContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title} - Print Preview</title>
        <meta charset="UTF-8">
        <style>
          body {
            margin: 0;
            padding: 20px;
            font-family: Arial, sans-serif;
            background: #f5f5f5;
          }
          .print-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            background: white;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
          }
          .print-controls button {
            margin: 5px;
            padding: 8px 16px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
          }
          .print-btn {
            background: #007bff;
            color: white;
          }
          .close-btn {
            background: #6c757d;
            color: white;
          }
          .print-content {
            background: white;
            padding: 20px;
            border-radius: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            max-width: 800px;
            margin: 0 auto;
          }
        </style>
      </head>
      <body>
        <div class="print-controls">
          <button class="print-btn" onclick="window.print()">🖨️ Print</button>
          <button class="close-btn" onclick="window.close()">❌ Close</button>
        </div>
        <div class="print-content">
          ${printContent.replace('<!DOCTYPE html>', '').replace('<html>', '').replace('<head>', '').replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '')}
        </div>
      </body>
      </html>
    `;
    
    // Write content to window
    previewWindow.document.write(enhancedContent);
    previewWindow.document.close();
    
    // Focus the window
    previewWindow.focus();
    
    return true;
  } catch (error) {
    console.error('Failed to open print preview:', error);
    return false;
  }
};

/**
 * Generate Xprinter 80mm optimized print content
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @param {string} type - Document type
 * @param {Function} t - Translation function
 * @returns {string} Xprinter-optimized HTML content
 */
export const generateXprinterPrintContent = (data, title, type, t) => {

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.2;
          color: #000;
          width: 80mm;
          max-width: 80mm;
          margin: 0 auto;
          padding: 2mm;
          background: white;
        }
        
        .receipt-header {
          text-align: center;
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dashed #000;
        }
        
        .company-name {
          font-weight: bold;
          font-size: 14px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .document-title {
          font-weight: bold;
          font-size: 13px;
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .receipt-date {
          font-size: 11px;
          color: #555;
        }
        
        .receipt-section {
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dotted #ccc;
        }
        
        .section-title {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 3px;
          text-transform: uppercase;
          background: #f0f0f0;
          padding: 1px 3px;
        }
        
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 11px;
        }
        
        .item-name {
          font-weight: bold;
          margin-bottom: 1px;
          word-wrap: break-word;
          max-width: 22ch; /* 80mm = ~32 chars, leave space for price */
        }
        
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #555;
        }
        
        .receipt-totals {
          margin: 6px 0;
          padding-top: 4px;
          border-top: 2px solid #000;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-weight: bold;
          font-size: 11px;
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px dashed #000;
          font-size: 10px;
          color: #666;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 1mm;
            width: 80mm;
          }
          
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <div class="company-name" style="text-align: center;">________ANTATSIMO_______</div>
        <div class="company-name" style="text-align: center;">${'\u00A0'}</div>
        <div class="document-title" style="text-align: center;">SALE RECEIPT</div>
        <div class="receipt-date" style="text-align: center;">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="receipt-section">
        <div class="no-data">${'\u00A0'}</div>
        <div class="section-title">SALE INFO</div>
        <div class="receipt-row">
          <span>Sale No:</span>
          <span>${data.sale_number || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Sale Status:</span>
          <span>${data.status || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Customer:</span>
          <span>${(data.customer_name || 'Walk-in Customer').substring(0, 25)}</span>
        </div>
        ${data.customer_phone ? `
          <div class="receipt-row">
            <span>Phone:</span>
            <span>${data.customer_phone}</span>
          </div>
        ` : ''}
        <div class="receipt-row">
          <span>Peyment Status:</span>
          <span>${data.payment_status}</span>
        </div>

        <div class="no-data">${'\u00A0'}</div>
        <div class="no-data">==================================================</div>

      </div>
      <div class="receipt-section">
        <div class="section-title">ITEMS SOLD</div>    
        <div class="no-data">__________________________________________________</div>
        <div class="item-details">
          <span>Info</span>
          <span>
            Qte${'\u00A0'.repeat(10)}Total${'\u00A0'.repeat(2)}
          </span>
        </div>
        <div class="no-data">¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯</div> 
        ${data.items && Array.isArray(data.items) ? data.items.map(item => `
          <div class="sale-item">
            <div class="item-name">${(item.product_name || 'N/A').substring(0, 25)} </div>
            <div class="item-details">
              <span>
                ${`(${item.unit_name})${parseFloat(item.unit_price || 0).toFixed(2)}`.padEnd(26, '\u00A0')}
                ${(item.quantity_display || item.quantity || 0).toString().padStart(3, '\u00A0')}
                ${parseFloat(item.total_price || 0).toFixed(2).padStart(12, '\u00A0')} MGA
              </span>
            </div>
          </div>
        `).join('') : '<div class="no-data">No items found</div>'}
        <div class="no-data">__________________________________________________</div>
        <div class="no-data">==================================================</</div>

      </div>      
      <div class="receipt-totals">
        <div class="receipt-row">
          <span>Subtotal:</span>
          <span>${parseFloat(data.total_amount || 0).toFixed(2)} MGA</span>
        </div>
        <div class="receipt-row">
          <span>Paid:</span>
          <span>${parseFloat(data.paid_amount || 0).toFixed(2)} MGA</span>
        </div>
        ${data.payment_status === 'partial' ? `
          <div class="receipt-row">
            <span>Due:</span>
            <span>${parseFloat(data.remaining_amount || 0).toFixed(2)} MGA</span>
          </div>
        ` : ''}
        <div class="no-data">__________________________________________________</div>
        <div class="no-data">==================================================</</div>
        <div class="no-data">${'\u00A0'}</div>
      </div>
      <div class="receipt-footer">
        <div class="thank-you">Thank you!</div>
        <div class="footer-text" style="text-align: center;">Created by: ${(data.created_by_name || data.sold_by_name || 'N/A')}</div>
        <div class="footer-text" style="text-align: center;">Print id : ${data.print_id || 'N/A'}</div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate mobile-optimized print content
 * @param {Object} data - Data to print
 * @param {string} title - Document title
 * @param {string} type - Document type
 * @param {Function} t - Translation function
 * @returns {string} Mobile-optimized HTML content
 */
export const generateMobilePrintContent = (data, title, type, t) => {
  const isMobile = isMobileDevice();
  const printerType = detectPrinterType();
  
  // Use smaller dimensions for mobile
  const width = isMobile ? '58mm' : '80mm';
  const fontSize = isMobile ? '10px' : '12px';
  const maxChars = isMobile ? 24 : 32;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: ${fontSize};
          line-height: 1.2;
          color: #000;
          width: ${width};
          max-width: ${width};
          margin: 0 auto;
          padding: 2mm;
          background: white;
        }
        
        .receipt-header {
          text-align: center;
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dashed #000;
        }
        
        .company-name {
          font-weight: bold;
          font-size: ${isMobile ? '12px' : '14px'};
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .document-title {
          font-weight: bold;
          font-size: ${isMobile ? '11px' : '13px'};
          margin-bottom: 2px;
          text-transform: uppercase;
        }
        
        .receipt-date {
          font-size: ${isMobile ? '9px' : '11px'};
          color: #555;
        }
        
        .receipt-section {
          margin-bottom: 6px;
          padding-bottom: 4px;
          border-bottom: 1px dotted #ccc;
        }
        
        .section-title {
          font-weight: bold;
          font-size: ${isMobile ? '9px' : '11px'};
          margin-bottom: 3px;
          text-transform: uppercase;
          background: #f0f0f0;
          padding: 1px 3px;
        }
        
        .receipt-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: ${isMobile ? '9px' : '11px'};
        }
        
        .item-name {
          font-weight: bold;
          margin-bottom: 1px;
          word-wrap: break-word;
          max-width: ${maxChars - 10}ch;
        }
        
        .item-details {
          display: flex;
          justify-content: space-between;
          font-size: ${isMobile ? '8px' : '10px'};
          color: #555;
        }
        
        .receipt-totals {
          margin: 6px 0;
          padding-top: 4px;
          border-top: 2px solid #000;
        }
        
        .total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-weight: bold;
          font-size: ${isMobile ? '9px' : '11px'};
        }
        
        .receipt-footer {
          text-align: center;
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px dashed #000;
          font-size: ${isMobile ? '8px' : '10px'};
          color: #666;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 1mm;
            width: ${width};
          }
          
          @page {
            size: ${width} auto;
            margin: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="receipt-header">
        <div class="company-name" style="text-align: center;">________ANTATSIMO_______</div>
        <div class="company-name" style="text-align: center;">${'\u00A0'}</div>
        <div class="document-title" style="text-align: center;">SALE RECEIPT</div>
        <div class="receipt-date" style="text-align: center;">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
      </div>
      <div class="receipt-section">
        <div class="no-data">${'\u00A0'}</div>
        <div class="section-title">SALE INFO</div>
        <div class="receipt-row">
          <span>Sale No:</span>
          <span>${data.sale_number || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Sale Status:</span>
          <span>${data.status || 'N/A'}</span>
        </div>
        <div class="receipt-row">
          <span>Customer:</span>
          <span>${(data.customer_name || 'Walk-in Customer').substring(0, 25)}</span>
        </div>
        ${data.customer_phone ? `
          <div class="receipt-row">
            <span>Phone:</span>
            <span>${data.customer_phone}</span>
          </div>
        ` : ''}
        <div class="receipt-row">
          <span>Peyment Status:</span>
          <span>${data.payment_status}</span>
        </div>

        <div class="no-data">${'\u00A0'}</div>
        <div class="no-data">==================================================</div>

      </div>
      <div class="receipt-section">
        <div class="section-title">ITEMS SOLD</div>             
        <div class="no-data">__________________________________________________</div>
        <div class="item-details">
          <span>Info</span>
          <span>
            Qte${'\u00A0'.repeat(10)}Total${'\u00A0'.repeat(2)}
          </span>
        </div>
        <div class="no-data">¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯</div> 
        ${data.items && Array.isArray(data.items) ? data.items.map(item => `
          <div class="sale-item">
            <div class="item-name">${(item.product_name || 'N/A').substring(0, 25)} </div>
            <div class="item-details">
              <span>
                ${`(${item.unit_name})${parseFloat(item.unit_price || 0).toFixed(2)}`.padEnd(26, '\u00A0')}
                ${(item.quantity_display || item.quantity || 0).toString().padStart(3, '\u00A0')}
                ${parseFloat(item.total_price || 0).toFixed(2).padStart(12, '\u00A0')} MGA
              </span>
            </div>
          </div>
        `).join('') : '<div class="no-data">No items found</div>'}

        <div class="no-data">__________________________________________________</div>
        <div class="no-data">==================================================</</div>

      </div>        
      <div class="receipt-totals">
        <div class="receipt-row">
          <span>Subtotal:</span>
          <span>${parseFloat(data.total_amount || 0).toFixed(2)} MGA</span>
        </div>
        <div class="receipt-row">
          <span>Paid:</span>
          <span>${parseFloat(data.paid_amount || 0).toFixed(2)} MGA</span>
        </div>
        ${data.payment_status === 'partial' ? `
          <div class="receipt-row">
            <span>Due:</span>
            <span>${parseFloat(data.remaining_amount || 0).toFixed(2)} MGA</span>
          </div>
        ` : ''}
        <div class="no-data">__________________________________________________</div>
        <div class="no-data">==================================================</</div>
        <div class="no-data">${'\u00A0'}</div>
      </div>
      <div class="receipt-footer">
        <div class="thank-you">Thank you!</div>
        <div class="footer-text" style="text-align: center;">Created by: ${(data.created_by_name || data.sold_by_name || 'N/A')}</div>
        <div class="footer-text" style="text-align: center;">Print id : ${data.print_id || 'N/A'}</div>
      </div>
    </body>
    </html>
  `;
};

