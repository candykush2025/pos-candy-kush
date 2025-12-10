# Mobile API Testing Setup

This directory contains comprehensive tests for the mobile API endpoints.

## Files

- `mobile-api.test.js` - Unit tests with mocked dependencies
- `mobile-api.integration.test.js` - Integration tests against running server
- `run-integration-tests.js` - Test runner that starts dev server and runs integration tests
- `setup.js` - Jest setup with Firebase and date-fns mocks
- `jest.config.js` - Jest configuration

## Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests (starts dev server automatically)
npm run test:integration

# Run both unit and integration tests
npm run test:all
```

## Test Coverage

The tests cover all mobile API endpoints:

- `sales-summary` - Sales metrics and transaction data
- `sales-by-item` - Item-level sales breakdown
- `sales-by-category` - Category-level sales breakdown
- `sales-by-employee` - Employee performance data
- `stock` - Current inventory levels

## Integration Testing

Integration tests run against a live Next.js development server on port 3001. The test runner automatically:

1. Starts the development server
2. Waits for it to be ready
3. Runs all integration tests
4. Stops the server

## Environment Variables

Set `TEST_BASE_URL` to override the default integration test URL (http://localhost:3001).
