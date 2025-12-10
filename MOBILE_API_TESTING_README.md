# Mobile API Testing Guide

This guide provides easy ways to test the Mobile API endpoints before deployment.

## Prerequisites

1. **Start the development server:**

   ```bash
   npm run dev
   ```

   The server should be running on `http://localhost:3001`

2. **Make sure you have data in your Firebase/Firestore database** for meaningful test results.

## Test Scripts

### Option 1: PowerShell Script (Recommended - Detailed Results)

Run the comprehensive PowerShell test script:

```powershell
# Basic test
.\test-mobile-api.ps1

# Test with custom base URL
.\test-mobile-api.ps1 -BaseUrl "https://your-production-url.com"

# Verbose output with detailed responses
.\test-mobile-api.ps1 -Verbose

# Save results to JSON file
.\test-mobile-api.ps1 -SaveResults
```

**Features:**

- ✅ Tests all 11 endpoints and scenarios
- ✅ Colored output (green/red for pass/fail)
- ✅ Detailed error messages
- ✅ CORS headers validation
- ✅ Invalid input handling tests
- ✅ Saves results to JSON file (optional)
- ✅ Verbose mode for full response details

### Option 2: Batch Script (Simple - Windows Only)

Run the simple batch file:

```cmd
# Basic test
test-mobile-api.bat

# Test with custom URL
test-mobile-api.bat https://your-production-url.com
```

**Features:**

- ✅ Quick validation of all endpoints
- ✅ Simple pass/fail indicators
- ✅ Works on any Windows system

## Manual Testing

If you prefer manual testing, here are the key endpoints to test:

### 1. Sales Summary

```bash
# Today's sales
curl "http://localhost:3001/api/mobile?action=sales-summary&period=today"

# This week's sales
curl "http://localhost:3001/api/mobile?action=sales-summary&period=this_week"

# Custom date range
curl "http://localhost:3001/api/mobile?action=sales-summary&period=custom&start_date=2024-12-01&end_date=2024-12-10"
```

### 2. Sales by Item

```bash
curl "http://localhost:3001/api/mobile?action=sales-by-item&period=this_month"
```

### 3. Sales by Category

```bash
curl "http://localhost:3001/api/mobile?action=sales-by-category&period=this_month"
```

### 4. Sales by Employee

```bash
curl "http://localhost:3001/api/mobile?action=sales-by-employee&period=today"
```

### 5. Stock/Inventory

```bash
curl "http://localhost:3001/api/mobile?action=stock"
```

### 6. Error Handling

```bash
# Invalid action
curl "http://localhost:3001/api/mobile?action=invalid"

# Missing action
curl "http://localhost:3001/api/mobile"
```

## Expected Response Format

All successful responses follow this structure:

```json
{
  "success": true,
  "action": "sales-summary",
  "period": "today",
  "filters": {
    "date_range": {
      "from": "2024-12-10T00:00:00.000Z",
      "to": "2024-12-10T23:59:59.999Z"
    },
    "employee_ids": null
  },
  "generated_at": "2024-12-10T14:30:00.000Z",
  "data": {
    // Endpoint-specific data
  }
}
```

## Troubleshooting

### Common Issues

1. **Server not running:**

   - Make sure `npm run dev` is running
   - Check if port 3001 is available

2. **Empty responses:**

   - Check if you have data in Firebase/Firestore
   - Verify database connection

3. **CORS errors:**

   - The API includes CORS headers for mobile apps
   - If testing from browser, use a CORS extension

4. **Date format issues:**
   - Use ISO 8601 format: `YYYY-MM-DD`
   - Example: `2024-12-10`

### Debug Mode

For detailed debugging, check the server console output when running `npm run dev`. The API logs helpful information about:

- Data fetching operations
- Filter applications
- Calculation results

## Production Testing

Before deploying to production:

1. Update the base URL in test scripts
2. Test with real production data
3. Verify CORS headers work with your mobile app
4. Test with different date ranges and filters
5. Check response times are acceptable for mobile

## Files Created

- `test-mobile-api.ps1` - Comprehensive PowerShell test script
- `test-mobile-api.bat` - Simple Windows batch test script
- `MOBILE_API_DOCUMENTATION.md` - Complete API documentation
