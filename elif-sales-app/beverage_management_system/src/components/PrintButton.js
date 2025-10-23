import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from './Button';
import { 
  createThermalPrintDocument, 
  detectPrinterType, 
  mobilePrint, 
  generateMobilePrintContent,
  generateXprinterPrintContent,
  downloadReceiptFile,
  generatePDFContent,
  generateESCPOSForReceiptApp,
  isMobileDevice,
  openPrintWindow,
  openPrintPreview,
  generatePrintContent,
} from '../utils/printUtils';
import './PrintButton.css';

const PrintButton = ({ 
  data, 
  title, 
  type = 'default', 
  onValidate = null, 
  validateText = 'Validate & Print',
  printText = 'Print',
  className = '',
  disabled = false,
  showValidateOption = false
}) => {
  const { t } = useTranslation();
  const [isPrinting, setIsPrinting] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);

  const handlePrint = async (validateFirst = false, useThermalPrinter = false, useReceiptApp = false, usePreview = false) => {
    // Validate data structure
    if (!data) {
      console.error('No data provided to PrintButton');
      window.alert(t('print.no_data', 'No data available to print.'));
      return;
    }

    if (validateFirst && onValidate) {
      try {
        await onValidate();
      } catch (error) {
        console.error('Validation failed:', error);
        return;
      }
    }

    setIsPrinting(true);
    
    try {
      let printContent;
      const isMobile = isMobileDevice();
      
      // Handle receipt app integration
      if (useReceiptApp) {
        console.log('Attempting to download receipt file...', { data, title });
        const success = downloadReceiptFile(data, title);
        console.log('Download result:', success);
        if (success) {
          window.alert(t('print.pdf_downloaded', 'Receipt PDF downloaded! You can now open it with any PDF viewer or receipt printer app to print directly to your Xprinter.'));
          return;
        } else {
          throw new Error('Failed to download receipt file.');
        }
      }
      
      // Generate appropriate content based on device and printer type
      if (useThermalPrinter || isMobile) {
        // Use Xprinter-optimized content for better compatibility
        // printContent = generateXprinterPrintContent(data, title, type, t);
        printContent = generatePrintContent(data, title, type, t);
      } else {
        printContent = generatePrintContent(data, title, type, t);
      }
      
      // Handle print preview
      if (usePreview) {
        const previewSuccess = openPrintPreview(printContent, title);
        if (previewSuccess) {
          return;
        } else {
          throw new Error('Failed to open print preview window.');
        }
      }
      
      // Use mobile-friendly printing for mobile devices
      if (isMobile) {
        const success = await mobilePrint(printContent, title);
        if (!success) {
          // If mobile printing fails, offer receipt app option
          const useReceiptApp = window.confirm(t('print.mobile_failed_offer_app', 'Mobile printing failed. Would you like to download a file for receipt printer apps instead?'));
          if (useReceiptApp) {
            const downloadSuccess = downloadReceiptFile(data, title);
            if (downloadSuccess) {
              window.alert(t('print.pdf_downloaded', 'Receipt PDF downloaded! You can now open it with any PDF viewer or receipt printer app to print directly to your Xprinter.'));
              return;
            }
          }
          throw new Error('Mobile printing failed. Please try again or check your printer connection.');
        }
      } else {
        // Desktop printing with enhanced error handling
        // Try print preview first for better visibility
        const previewSuccess = openPrintPreview(printContent, title);
        if (previewSuccess) {
          // Preview opened successfully, user can print from there
          return;
        } else {
          // Fallback to direct print window
          const success = await openPrintWindow(printContent, title);
          if (!success) {
            throw new Error('Failed to open print window. Please check popup blockers and try again.');
          }
        }
      }
      
    } catch (error) {
      console.error('Print error:', error);
      
      // Provide more specific error messages
      let errorMessage = t('print.failed', 'Failed to print. Please try again.');
      
      if (error.message.includes('popup')) {
        errorMessage = t('print.popup_blocked', 'Popup blocked. Please allow popups for this site and try again.');
      } else if (error.message.includes('Mobile printing failed')) {
        errorMessage = t('print.mobile_failed', 'Mobile printing failed. Please check your printer connection and try again.');
      } else if (error.message.includes('window.open')) {
        errorMessage = t('print.window_failed', 'Could not open print window. Please check your browser settings.');
      } else if (error.message.includes('Failed to download')) {
        errorMessage = t('print.download_failed', 'Failed to download receipt file. Please try again.');
      }
      
      window.alert(errorMessage);
    } finally {
      setIsPrinting(false);
      setShowPrintOptions(false);
    }
  };

  if (showValidateOption && onValidate) {
    return (
      <div className={`print-button-container ${className}`}>
        <Button
          variant="outline"
          size="small"
          onClick={() => setShowPrintOptions(!showPrintOptions)}
          disabled={disabled}
        >
          {showPrintOptions ? t('button.hide_options', 'Hide Options') : t('button.show_options', 'Show Options')}
        </Button>
        {showPrintOptions && (
          <div className="print-options">
            <Button
              variant="primary"
              size="small"
              onClick={() => handlePrint(true)}
              disabled={disabled || isPrinting}
            >
              {isPrinting ? t('button.processing', 'Processing...') : validateText}
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => handlePrint(false)}
              disabled={disabled || isPrinting}
            >
              {isPrinting ? t('button.preparing', 'Preparing...') : printText}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => handlePrint(false, true)}
              disabled={disabled || isPrinting}
            >
              {isPrinting ? t('button.preparing', 'Preparing...') : t('button.print_thermal', 'Print (Thermal)')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Show different options for mobile vs desktop
  const isMobile = isMobileDevice();
  
  if (isMobile) {
    return (
      <div className={`print-button-container ${className}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Button
            variant="primary"
            size="small"
            onClick={() => handlePrint(false, true)}
            disabled={disabled || isPrinting}
          >
            {isPrinting ? t('button.printing', 'Printing...') : t('button.print_receipt', 'Print Receipt')}
          </Button>
          
          <Button
            variant="secondary"
            size="small"
            onClick={() => handlePrint(false, false, true)}
            disabled={disabled || isPrinting}
          >
            {isPrinting ? t('button.downloading', 'Downloading...') : t('button.download_pdf', 'Download PDF')}
          </Button>
          
          <Button
            variant="outline"
            size="small"
            onClick={() => handlePrint(false, false, false, true)}
            disabled={disabled || isPrinting}
          >
            {isPrinting ? t('button.loading', 'Loading...') : t('button.preview', 'Print Preview')}
          </Button>
          
          {showValidateOption && onValidate && (
            <Button
              variant="outline"
              size="small"
              onClick={() => handlePrint(true, true)}
              disabled={disabled || isPrinting}
            >
              {isPrinting ? t('button.processing', 'Processing...') : validateText}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`print-button-container ${className}`}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Button
          variant="outline"
          size="small"
          onClick={() => handlePrint(false, true)}
          disabled={disabled || isPrinting}
        >
          {isPrinting ? t('button.printing', 'Printing...') : printText}
        </Button>
        
        <Button
          variant="secondary"
          size="small"
          onClick={() => handlePrint(false, false, true)}
          disabled={disabled || isPrinting}
        >
          {isPrinting ? t('button.downloading', 'Downloading...') : t('button.download_pdf', 'Download PDF')}
        </Button>
        
        <Button
          variant="outline"
          size="small"
          onClick={() => handlePrint(false, false, false, true)}
          disabled={disabled || isPrinting}
        >
          {isPrinting ? t('button.loading', 'Loading...') : t('button.preview', 'Print Preview')}
        </Button>
      </div>
    </div>
  );
};

export default PrintButton;