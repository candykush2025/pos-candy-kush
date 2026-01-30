# Admin Dashboard Documentation

## Overview

The Admin Dashboard is a comprehensive analytics and management interface for the Candy Kush POS system, accessible at `/admin/dashboard`. It provides real-time insights into sales performance, inventory status, customer behavior, and payment trends.

## Key Features

### 1. Date Range Selection

- **Month/Year Mode**: Default view showing data for selected month and year
- **Custom Date Range**: Flexible date selection with start and end dates
- **Quick Presets**: Today, This Week, This Month, This Year, Custom Period
- **Fair Comparison**: Previous period calculations adjust for same day ranges

### 2. Category Filtering

- Filter all analytics by product categories
- Shows category tag in header when filtered
- Affects all metrics, charts, and lists

## Analytics Metrics

### Key Statistics Cards (6 metrics)

#### 1. Period/Month Revenue

- **Data Source**: Sum of all receipt totals in selected period
- **Display Format**: Currency (based on store settings)
- **Comparison**: vs previous period/month (% change)
- **Date Display**: Shows selected date range or month/year

#### 2. Gross Profit

- **Calculation**: Revenue - Total Cost
- **Data Source**: Product costs from inventory data
- **Display Format**: Currency with profit margin percentage
- **Subtitle**: Shows total cost amount

#### 3. Today's Sales

- **Data Source**: All receipts from current date
- **Display Format**: Currency
- **Comparison**: vs yesterday (% change)
- **Subtitle**: Current date

#### 4. Period/Month Orders

- **Data Source**: Count of receipts in selected period
- **Display Format**: Number
- **Comparison**: vs previous period/month (% change)
- **Subtitle**: Date range or month/year

#### 5. Average Order Value (AOV)

- **Calculation**: Total Revenue ÷ Number of Orders
- **Display Format**: Currency
- **Comparison**: vs previous month (% change)
- **Subtitle**: Average items per transaction

#### 6. Customer Insights

- **Data Source**: Unique customers in period
- **Display Format**: Total customers (new + returning)
- **Comparison**: Repeat customer rate (%)
- **Subtitle**: Breakdown of new vs returning customers

## Charts and Visualizations

### 1. Daily Sales Chart

- **Type**: Bar Chart
- **Data**: Revenue per day in selected period
- **X-Axis**: Date (MM/DD format)
- **Y-Axis**: Revenue amount
- **Tooltip**: Formatted currency values

### 2. Monthly Revenue Trend

- **Type**: Line Chart
- **Data**: Revenue for each month of selected year
- **X-Axis**: Month names (Jan, Feb, etc.)
- **Y-Axis**: Revenue amount
- **Tooltip**: Formatted currency values

### 3. Peak Hours Analysis

- **Type**: Area Chart
- **Data**: Revenue distribution by hour (0-23)
- **X-Axis**: Time labels (12AM, 1AM, ..., 11PM)
- **Y-Axis**: Revenue amount
- **Summary Stats**:
  - Peak Revenue Hour
  - Busiest Hour (by order count)
  - Peak Hour Percentage of daily revenue
  - Total Orders in period

### 4. Payment Methods Distribution

- **Type**: Pie Chart
- **Data**: Revenue breakdown by payment type
- **Colors**: Green, Blue, Yellow, Red, Purple
- **Labels**: Payment method name with percentage
- **Tooltip**: Formatted currency values

## Data Tables and Lists

### 1. Top Selling Products

- **Data**: Top 5 products by revenue in period
- **Columns**: Product name, Quantity sold, Revenue
- **Sorting**: By revenue (highest first)
- **Display**: Product name, quantity, formatted revenue

### 2. Low Stock Alerts

- **Data**: Products with stock ≤ 10 units
- **Columns**: Product name, SKU, Stock level, Price
- **Sorting**: By stock level (lowest first)
- **Color Coding**:
  - Red: ≤ 3 units
  - Yellow: 4-5 units
  - Neutral: 6-10 units

### 3. Top Customers

- **Data**: Top 5 customers by total spend
- **Columns**: Rank, Customer name, Order count, Total spent
- **Display**: Customer name, email/phone, order count, formatted total
- **Ranking**: Gold medal for #1, silver for #2, bronze for #3

### 4. Sales by Payment Type

- **Type**: Table with totals
- **Columns**: Payment Type, Transactions, Amount
- **Footer**: Total row with sums
- **Data**: All payment methods used in period

### 5. Latest Transactions

- **Data**: 10 most recent transactions across all time
- **Columns**: Receipt number, Date/time, Item count, Amount, Payment method
- **Display**: Formatted receipt ID, localized date/time, item count, currency amount

## Data Sources and Calculations

### Receipt Data

- **Source**: Firebase Firestore (receipts collection)
- **Fields Used**:
  - `receiptDate` / `receipt_date`: Transaction date
  - `totalMoney` / `total_money`: Transaction total
  - `lineItems` / `line_items`: Product details
  - `payments`: Payment method information
  - `customerId` / `customer_id`: Customer reference

### Product Data

- **Source**: Firebase Firestore (products collection)
- **Fields Used**:
  - `cost` / `purchaseCost`: Product cost for profit calculations
  - `stock`: Current inventory levels
  - `price`: Selling price
  - `name`: Product display name

### Customer Data

- **Source**: Firebase Firestore (customers collection)
- **Fields Used**:
  - `name` / `first_name` + `last_name`: Customer display name
  - `email`: Customer email
  - `phone`: Customer phone
  - Multiple ID formats supported for matching

### Date Handling

- **Receipt Date Priority**:
  1. `receipt_date` (snake_case)
  2. `receiptDate` (camelCase)
  3. `created_at` / `createdAt` (fallback)
- **Timezone**: All dates treated as UTC for consistency
- **Display**: Localized formatting for user interface

### Currency and Money Values

- **Currency**: Dynamic based on store settings from API
- **Formatting**: Uses `formatCurrency` utility with store currency configuration
- **Value Resolution**: Handles multiple money field formats
- **Precision**: Rounded to 2 decimal places

## Technical Implementation

### State Management

- React hooks for all dashboard state
- Real-time data loading with loading states
- Error handling for data fetch failures

### Performance Optimizations

- Parallel data fetching (products, customers, stock)
- Efficient filtering and calculation algorithms
- Responsive design for mobile/desktop
- Skeleton loading states

### Responsive Design

- Mobile-first approach
- Grid layouts adapt to screen size
- Touch-friendly interactions
- Optimized chart sizes for different devices

## User Interface Elements

### Navigation

- Header with title and refresh button
- Category filter dropdown
- Date range selector with presets

### Visual Design

- Dark/light theme support
- Hover effects and animations
- Color-coded metrics and alerts
- Consistent spacing and typography

### Accessibility

- Semantic HTML structure
- Keyboard navigation support
- Screen reader friendly labels
- High contrast color schemes

## Data Refresh and Updates

### Manual Refresh

- Refresh button in header
- Triggers full data reload
- Visual feedback during loading

### Real-time Updates

- Data refreshes on filter changes
- Immediate UI updates
- Loading states for all operations

## Error Handling

### Data Loading Errors

- Graceful fallbacks for missing data
- User-friendly error messages
- Console logging for debugging
- Retry mechanisms for failed requests

### Network Issues

- Offline data display
- User notifications for failures

### Data Validation

- Type checking for money values
- Date validation and parsing
- Fallback values for missing fields

## Future Enhancements

### Potential Features

- Export functionality (PDF/CSV)
- Advanced filtering options
- Custom dashboard layouts
- Predictive analytics
- Inventory forecasting
- Customer segmentation
- Sales forecasting
- Performance benchmarking

### Technical Improvements

- Data caching and optimization
- Real-time WebSocket updates
- Progressive Web App features
- Advanced chart customizations
- API rate limiting and optimization
