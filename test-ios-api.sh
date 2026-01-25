#!/bin/bash

# iOS API Endpoint Test Suite (Shell Script Version)
# Tests the live API at https://pos-candy-kush.vercel.app/api/mobile/ios

BASE_URL="https://pos-candy-kush.vercel.app/api/mobile/ios"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

# Print header
echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         iOS API Endpoint Test Suite (Shell)               ║"
echo "║         Testing: https://pos-candy-kush.vercel.app        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Helper function to test endpoint
test_endpoint() {
    local test_name="$1"
    local url="$2"
    local method="${3:-GET}"
    local data="$4"
    local expected_status="${5:-200}"
    
    if [ "$method" = "POST" ]; then
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
                -H "Content-Type: application/json" \
                -d "$data")
        fi
    else
        if [ -n "$TOKEN" ]; then
            response=$(curl -s -w "\n%{http_code}" -X GET "$url" \
                -H "Authorization: Bearer $TOKEN")
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$url")
        fi
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n1)
    # Extract body (all but last line)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((PASSED++))
        echo "$body"
    else
        echo -e "${RED}✗${NC} $test_name (Expected $expected_status, got $status_code)"
        ((FAILED++))
        echo "$body"
    fi
    
    echo ""
}

# Test 1: Health Check
echo -e "${CYAN}${BOLD}=== Testing Health Check ===${NC}"
test_endpoint "Health Check" "${BASE_URL}?action=health"

# Test 2: Authentication
echo -e "${CYAN}${BOLD}=== Testing Authentication ===${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}?action=login" \
    -H "Content-Type: application/json" \
    -d '{"email":"testingcashier@candykush.com","password":"testing123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓${NC} Login successful"
    echo -e "${BLUE}Token:${NC} ${TOKEN:0:50}..."
    ((PASSED++))
else
    echo -e "${RED}✗${NC} Login failed"
    echo "$LOGIN_RESPONSE"
    ((FAILED++))
fi
echo ""

# Test 3: Products
echo -e "${CYAN}${BOLD}=== Testing Products ===${NC}"
test_endpoint "Get Products" "${BASE_URL}?action=get-products"
test_endpoint "Get Categories" "${BASE_URL}?action=get-categories"

# Test 4: Customers
echo -e "${CYAN}${BOLD}=== Testing Customers ===${NC}"
test_endpoint "Get Customers" "${BASE_URL}?action=get-customers"

# Test 5: Receipts
echo -e "${CYAN}${BOLD}=== Testing Receipts ===${NC}"
test_endpoint "Get Receipts" "${BASE_URL}?action=get-receipts"

# Test 6: Expenses
echo -e "${CYAN}${BOLD}=== Testing Expenses ===${NC}"
test_endpoint "Get Expense Categories" "${BASE_URL}?action=get-expense-categories"
test_endpoint "Get Expenses" "${BASE_URL}?action=get-expenses"

# Test 7: Shifts
echo -e "${CYAN}${BOLD}=== Testing Shifts ===${NC}"
test_endpoint "Get Shifts" "${BASE_URL}?action=get-shifts"

# Test 8: Cashback
echo -e "${CYAN}${BOLD}=== Testing Cashback ===${NC}"
test_endpoint "Get Cashback Rules" "${BASE_URL}?action=get-cashback-rules"
test_endpoint "Get Point Usage Rules" "${BASE_URL}?action=get-point-usage-rules"

# Test 9: Stock
echo -e "${CYAN}${BOLD}=== Testing Stock Management ===${NC}"
test_endpoint "Get Stock" "${BASE_URL}?action=get-stock"
test_endpoint "Get Purchase Orders" "${BASE_URL}?action=get-purchase-orders"

# Test 10: Users
echo -e "${CYAN}${BOLD}=== Testing Users ===${NC}"
test_endpoint "Get Users" "${BASE_URL}?action=get-users"

# Test 11: Settings
echo -e "${CYAN}${BOLD}=== Testing Settings ===${NC}"
test_endpoint "Get Settings" "${BASE_URL}?action=get-settings"
test_endpoint "Get Exchange Rates" "${BASE_URL}?action=get-exchange-rates"

# Test 12: Analytics
echo -e "${CYAN}${BOLD}=== Testing Analytics ===${NC}"
test_endpoint "Get Dashboard Analytics" "${BASE_URL}?action=get-dashboard-analytics"
test_endpoint "Get Sold Items" "${BASE_URL}?action=get-sold-items"

# Test 13: Advanced Reports (NEW)
echo -e "${CYAN}${BOLD}=== Testing Advanced Reports ===${NC}"
test_endpoint "Get Sales by Employee" "${BASE_URL}?action=get-sales-by-employee"
test_endpoint "Get Sales by Category" "${BASE_URL}?action=get-sales-by-category"
test_endpoint "Get Sales by Payment Method" "${BASE_URL}?action=get-sales-by-payment-method"

# Test 14: Refunds & Payment Changes (NEW)
echo -e "${CYAN}${BOLD}=== Testing Refunds & Payment Changes ===${NC}"
test_endpoint "Get Refund Requests" "${BASE_URL}?action=get-refund-requests"
test_endpoint "Get Payment Change Requests" "${BASE_URL}?action=get-payment-change-requests"

# Test 15: Export (NEW)
echo -e "${CYAN}${BOLD}=== Testing Export ===${NC}"
test_endpoint "Export Products (JSON)" "${BASE_URL}?action=export-data&type=products&format=json"

# Test 16: Create Operations
echo -e "${CYAN}${BOLD}=== Testing Create Operations ===${NC}"

# Create Product
test_endpoint "Create Product" "${BASE_URL}?action=create-product" "POST" \
    '{"name":"Test Product from Shell","price":99.99,"cost":50.00,"categoryId":"cat_001","categoryName":"Electronics","stock":100,"trackStock":true,"sku":"SHELL-001","isAvailable":true,"source":"local"}'

# Create Expense
test_endpoint "Create Expense" "${BASE_URL}?action=create-expense" "POST" \
    '{"category":"Office Supplies","amount":85.50,"currency":"USD","description":"Test from shell script","date":"2026-01-23","time":"16:00","source":"BackOffice"}'

# Test 17: Unauthorized Access
echo -e "${CYAN}${BOLD}=== Testing Authorization ===${NC}"
TOKEN_BACKUP="$TOKEN"
TOKEN=""
test_endpoint "Unauthorized Access Returns 401" "${BASE_URL}?action=get-products" "GET" "" "401"
TOKEN="$TOKEN_BACKUP"

# Print Summary
echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    TEST SUMMARY                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

TOTAL=$((PASSED + FAILED))
SUCCESS_RATE=$(awk "BEGIN {printf \"%.2f\", ($PASSED/$TOTAL)*100}")

echo -e "${BOLD}Total Tests:${NC} $TOTAL"
echo -e "${GREEN}${BOLD}Passed:${NC} $PASSED"
echo -e "${RED}${BOLD}Failed:${NC} $FAILED"
echo -e "${BOLD}Success Rate:${NC} ${SUCCESS_RATE}%"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}${BOLD}✗ Some tests failed${NC}"
    exit 1
fi
