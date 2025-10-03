# Purchase Orders & Deliveries System

This document describes the new Purchase Orders and Deliveries feature that has been added to the Beverage Management System.

## Overview

The Purchase Orders & Deliveries system allows you to:
1. **Manage Suppliers**: Create and maintain supplier information
2. **Create Purchase Orders**: Prepare orders to send to suppliers
3. **Process Deliveries**: Receive goods and update stock automatically
4. **Track Progress**: Monitor order status and delivery progress

## Features

### 1. Supplier Management
- Add, edit, and manage supplier information
- Store contact details, payment terms, and tax information
- Enable/disable suppliers as needed

### 2. Purchase Orders
- Create purchase orders with multiple items
- Set expected delivery dates
- Calculate totals with taxes
- Track order status (Draft → Sent → Confirmed → Delivered)

### 3. Deliveries
- Create deliveries based on purchase orders
- Modify quantities, prices, and taxes during delivery
- Add condition notes for received items
- Confirm deliveries to automatically update stock

### 4. Stock Integration
- Automatic stock updates when deliveries are confirmed
- Stock movement tracking with delivery references
- Integration with existing inventory system

## Database Models

### Supplier
- Basic supplier information (name, contact, address)
- Payment terms and tax number
- Active/inactive status

### PurchaseOrder
- Links to supplier
- Order number (auto-generated)
- Status tracking
- Financial totals (subtotal, tax, total)

### PurchaseOrderItem
- Individual items in a purchase order
- Quantity ordered, unit cost, tax class
- Calculated line totals and tax amounts

### Delivery
- Links to purchase order
- Delivery number (auto-generated)
- Status tracking (pending → received → verified → completed)
- Financial totals

### DeliveryItem
- Individual items in a delivery
- Quantity received (can differ from ordered)
- Modified unit cost and tax class
- Condition notes

## API Endpoints

### Suppliers
- `GET /api/purchases/suppliers/` - List all suppliers
- `POST /api/purchases/suppliers/` - Create new supplier
- `GET /api/purchases/suppliers/{id}/` - Get supplier details
- `PUT /api/purchases/suppliers/{id}/` - Update supplier
- `DELETE /api/purchases/suppliers/{id}/` - Delete supplier

### Purchase Orders
- `GET /api/purchases/purchase-orders/` - List all purchase orders
- `POST /api/purchases/purchase-orders/` - Create new purchase order
- `GET /api/purchases/purchase-orders/{id}/` - Get purchase order details
- `PUT /api/purchases/purchase-orders/{id}/` - Update purchase order
- `GET /api/purchases/purchase-orders/{id}/status/` - Get order status and progress

### Deliveries
- `GET /api/purchases/deliveries/` - List all deliveries
- `POST /api/purchases/deliveries/` - Create new delivery
- `GET /api/purchases/deliveries/{id}/` - Get delivery details
- `POST /api/purchases/deliveries/confirm/` - Confirm delivery and update stock
- `GET /api/purchases/deliveries/pending/` - Get pending deliveries

### Utility Endpoints
- `GET /api/purchases/suppliers/{id}/products/` - Get products for supplier
- `GET /api/purchases/products/low-stock/` - Get low stock products

## Frontend Components

### Pages
- **PurchaseOrders**: Main page with side-by-side layout and mini navigation
- **Suppliers**: Supplier management page

### Components
- **PurchaseOrderModal**: Create/edit purchase orders with unit selection
- **DeliveryModal**: Create deliveries from purchase orders with unit conversion
- **EditDeliveryModal**: Edit pending deliveries with comprehensive item management
- **SupplierModal**: Create/edit suppliers

### Layout Features
- **Side-by-Side Design**: Modern layout with navigation panel and main content area
- **Mini Navigation**: Tabbed interface for Purchase Orders, Pending Deliveries, and Delivery History
- **Responsive Design**: Adapts to different screen sizes (desktop, tablet, mobile)
- **Count Display**: Shows number of items in each category
- **Active State Highlighting**: Visual feedback for current selection

## Workflow

### 1. Setup Suppliers
1. Go to "Suppliers" page
2. Click "Add New Supplier"
3. Fill in supplier details
4. Save supplier

### 2. Create Purchase Order
1. Go to "Purchase Orders" page (defaults to Purchase Orders tab)
2. Click "Create Purchase Order"
3. Select supplier
4. Add items with quantities, units, and costs (unit selection shows only compatible units)
5. Set expected delivery date
6. Save order

### 3. Process Delivery
1. From purchase order, click "Create Delivery" or switch to "Pending Deliveries" tab
2. Specify quantities actually received (unit pre-selected from purchase order)
3. Modify prices if needed
4. Add condition notes
5. Save delivery

### 4. Confirm Delivery
1. Switch to "Pending Deliveries" tab or use the mini navigation
2. Click "Confirm & Update Stock" on the delivery
3. System automatically updates product stock with unit conversion
4. Creates stock movement records
5. Marks delivery as completed

### 5. View History
1. Switch to "Delivery History" tab
2. View all completed deliveries with print options
3. Track received dates and delivery details

## Status Flow

### Purchase Order Status
- **Draft**: Initial state, can be edited
- **Sent**: Sent to supplier
- **Confirmed**: Confirmed by supplier
- **Partially Delivered**: Some items delivered
- **Delivered**: All items delivered
- **Cancelled**: Order cancelled

### Delivery Status
- **Pending**: Created but not yet received
- **Received**: Items received
- **Verified**: Items verified
- **Completed**: Delivery confirmed and stock updated

## Integration with Existing System

### Stock Management
- Deliveries automatically update product stock quantities with unit conversion
- Stock movements are tracked with delivery references
- Integration with existing low stock alerts
- Supports multi-unit stock tracking

### Product Management
- Uses existing Product, Category, and TaxClass models
- Maintains product cost prices and tax information
- Supports existing product SKU system
- **Unit System Integration**: Purchase orders and deliveries work with the multi-unit system
- **Unit Selection**: Only shows compatible units for each product
- **Price Conversion**: Automatically calculates prices for different units

### User Management
- Tracks who created orders and deliveries
- Uses existing user authentication system
- Respects user roles and permissions

### Multi-Unit System
- **Compatible Units**: Each product can have specific compatible units
- **Unit Conversion**: Automatic conversion between units (e.g., pieces to packs)
- **Price Calculation**: Prices automatically adjust based on unit selection
- **Stock Display**: Shows stock in multiple units simultaneously

## Security & Permissions

- All endpoints require authentication
- Uses existing JWT token system
- Follows same permission patterns as other modules

## Error Handling

- Comprehensive validation on all forms
- API error responses with detailed messages
- Frontend error handling with user-friendly messages

## Future Enhancements

Potential future improvements:
- Email notifications for order status changes
- Supplier performance tracking
- Purchase order templates
- Bulk import/export functionality
- Advanced reporting and analytics
- Integration with accounting systems

## Testing

The system has been tested with:
- Basic CRUD operations for all models
- Purchase order creation and delivery processing
- Stock update integration
- API endpoint functionality

## Support

For issues or questions about the Purchase Orders & Deliveries system, please refer to the main project documentation or contact the development team.
