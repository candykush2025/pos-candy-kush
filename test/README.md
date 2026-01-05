# Mobile API Testing Setup

This directory contains comprehensive tests for the mobile API endpoints deployed at `https://pos-candy-kush.vercel.app`.

## Test Results ✅

**Unit Tests:** 6/6 passed (100%)  
**Integration Tests:** 15/15 passed (100%)  
**Total:** 21/21 tests passed (100%)

## Files

- `mobile-api.test.js` - Unit tests with mocked dependencies
- `mobile-api.integration.test.js` - Integration tests against deployed production API
- `run-integration-tests.js` - Test runner for integration tests against production
- `setup.js` - Jest setup with Firebase and date-fns mocks (unit tests only)
- `jest.config.js` - Jest configuration for unit tests
- `jest.integration.config.js` - Jest configuration for integration tests (no mocks)

## Running Tests

```bash
# Run all tests (unit + integration)
npm run test:all

# Run unit tests only (fast, with mocks)
npm run test:unit

# Run integration tests against deployed API (slower, real API calls)
npm run test:integration

# Run all tests with Jest directly
npm test
```

## Test Coverage

The tests cover all mobile API endpoints deployed at `https://pos-candy-kush.vercel.app`:

### API Structure & Error Handling:

- Missing/invalid action parameters
- CORS headers for mobile apps
- OPTIONS preflight requests

### Sales Endpoints:

- `sales-summary` - All period types (today, this_week, this_month, this_year)
- `sales-by-item` - Item-level sales breakdown
- `sales-by-category` - Category-level sales breakdown
- `sales-by-employee` - Employee performance data
- Custom date ranges and employee filtering

### Stock/Inventory Endpoint:

- Current stock levels with low stock indicators
- Product summaries and stock value calculations

## Test Environments

- **Unit Tests**: Run with mocked Firebase services for fast testing
- **Integration Tests**: Run against the live deployed API at `https://pos-candy-kush.vercel.app`
