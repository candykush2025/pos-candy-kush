# Receipts Checker API - New Server Integration Guide

## Overview

This document provides comprehensive instructions for integrating with the Receipts Checker API endpoint to compare and import receipts from the old POS system to the new server.

## API Endpoint

**URL:** `GET /api/debug/receipts-checker`

**Environment:** Debug endpoint (disabled in production unless migration key is provided)

**Authentication:** None required in development, migration key required in production

## Production Access (Migration Mode)

In production environments, the endpoint requires a migration key for security:

### Using Query Parameter:

```
GET /api/debug/receipts-checker?migration_key=YOUR_MIGRATION_KEY&limit=10
```

### Using Header:

```
GET /api/debug/receipts-checker
Header: x-migration-key: YOUR_MIGRATION_KEY
```

### Setting the Migration Key:

Add to your environment variables:

```bash
RECEIPTS_MIGRATION_KEY=your-secure-migration-key-here
```

**Security Note:** Choose a strong, unique migration key and rotate it after migration is complete.

## Request Parameters

## Request Parameters

| Parameter         | Type    | Required | Default | Description                                  |
| ----------------- | ------- | -------- | ------- | -------------------------------------------- |
| `startDate`       | string  | No       | -       | Start date in YYYY-MM-DD format              |
| `endDate`         | string  | No       | -       | End date in YYYY-MM-DD format                |
| `receiptIds`      | string  | No       | -       | Comma-separated list of specific receipt IDs |
| `limit`           | number  | No       | 100     | Maximum receipts to return (max: 1000)       |
| `offset`          | number  | No       | 0       | Number of receipts to skip (pagination)      |
| `format`          | string  | No       | "full"  | Response format: "full" or "summary"         |
| `includePayments` | boolean | No       | true    | Include payment details                      |
| `includeItems`    | boolean | No       | true    | Include item details                         |

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    "receipts": [...],
    "total": 150,
    "returned": 100,
    "hasMore": true,
    "offset": 0,
    "limit": 100
  },
  "debug": {
    "requestId": "uuid-string",
    "timestamp": "2024-01-25T10:30:00.000Z",
    "processingTime": 1250,
    "query": {...},
    "filters": {...},
    "receiptsFound": 150,
    "receiptsReturned": 100,
    "hasMore": true
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "debug": {
    "requestId": "uuid-string",
    "timestamp": "2024-01-25T10:30:00.000Z",
    "processingTime": 500,
    "error": {
      "name": "ErrorName",
      "message": "Detailed error message",
      "stack": "..."
    }
  }
}
```

## Receipt Data Structure

### Full Format Receipt

```json
{
  "id": "firestore-document-id",
  "_firestoreId": "firestore-document-id",
  "_dataId": "internal-receipt-id",

  "receiptNumber": "RCP-001234",
  "createdAt": "2024-01-25T10:30:00.000Z",
  "updatedAt": "2024-01-25T10:35:00.000Z",

  "total": 125.50,
  "subtotal": 120.00,
  "tax": 5.50,
  "discount": 0.00,

  "customerId": "customer-uuid",
  "customerName": "John Doe",
  "cashierId": "cashier-uuid",
  "cashierName": "Jane Smith",

  "status": "completed",
  "notes": "Customer requested extra napkins",
  "tableNumber": "T5",
  "orderType": "dine-in",

  "payments": [
    {
      "id": "payment-1",
      "payment_type": "cash",
      "payment_type_name": "Cash Payment",
      "money_amount": 125.50,
      "paid_money": 130.00,
      "change": 4.50,
      "rawData": {...}
    }
  ],

  "items": [
    {
      "id": "item-1",
      "productId": "product-uuid",
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 15.00,
      "total": 30.00,
      "discount": 0.00,
      "tax": 2.40,
      "category": "Pizza",
      "rawData": {...}
    }
  ],

  "rawData": {...}
}
```

### Summary Format Receipt

```json
{
  "id": "firestore-document-id",
  "receiptNumber": "RCP-001234",
  "createdAt": "2024-01-25T10:30:00.000Z",
  "total": 125.5,
  "customerId": "customer-uuid",
  "cashierId": "cashier-uuid",
  "status": "completed",

  "payments": [
    {
      "type": "cash",
      "amount": 125.5,
      "payment_type_name": "Cash Payment"
    }
  ],

  "items": [
    {
      "productId": "product-uuid",
      "name": "Margherita Pizza",
      "quantity": 2,
      "price": 15.0,
      "total": 30.0
    }
  ]
}
```

## New Server Integration Script

### Node.js Example Script

```javascript
const axios = require("axios");
const fs = require("fs");

class ReceiptsChecker {
  constructor(baseUrl = "https://your-pos-domain.com", migrationKey = null) {
    this.baseUrl = baseUrl;
    this.migrationKey = migrationKey;
    this.endpoint = "/api/debug/receipts-checker";
  }

  /**
   * Fetch receipts from the old system
   */
  async fetchReceipts(options = {}) {
    const {
      startDate,
      endDate,
      receiptIds,
      limit = 100,
      offset = 0,
      format = "full",
      includePayments = true,
      includeItems = true,
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      format,
      includePayments: includePayments.toString(),
      includeItems: includeItems.toString(),
    });

    // Add migration key for production access
    if (this.migrationKey) {
      params.append("migration_key", this.migrationKey);
    }

    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (receiptIds) params.append("receiptIds", receiptIds.join(","));

    const url = `${this.baseUrl}${this.endpoint}?${params}`;

    try {
      console.log(`Fetching receipts from: ${url}`);
      const response = await axios.get(url, { timeout: 30000 });

      if (!response.data.success) {
        throw new Error(`API Error: ${response.data.error}`);
      }

      return response.data;
    } catch (error) {
      console.error("Error fetching receipts:", error.message);
      throw error;
    }
  }

  /**
   * Compare receipts with new server data
   */
  async compareReceipts(oldReceipts, newServerReceipts) {
    const comparison = {
      matched: [],
      missing: [],
      different: [],
      summary: {
        totalOld: oldReceipts.length,
        totalNew: newServerReceipts.length,
        matched: 0,
        missing: 0,
        different: 0,
      },
    };

    // Create lookup map for new server receipts
    const newReceiptsMap = new Map();
    newServerReceipts.forEach((receipt) => {
      const key = this.getReceiptKey(receipt);
      newReceiptsMap.set(key, receipt);
    });

    // Compare each old receipt
    for (const oldReceipt of oldReceipts) {
      const key = this.getReceiptKey(oldReceipt);
      const newReceipt = newReceiptsMap.get(key);

      if (!newReceipt) {
        comparison.missing.push({
          oldReceipt,
          reason: "Not found in new server",
        });
        comparison.summary.missing++;
      } else {
        const differences = this.compareReceiptData(oldReceipt, newReceipt);
        if (differences.length === 0) {
          comparison.matched.push({
            oldReceipt,
            newReceipt,
          });
          comparison.summary.matched++;
        } else {
          comparison.different.push({
            oldReceipt,
            newReceipt,
            differences,
          });
          comparison.summary.different++;
        }
      }
    }

    return comparison;
  }

  /**
   * Generate a unique key for receipt comparison
   */
  getReceiptKey(receipt) {
    // Use receipt number + date + total as unique identifier
    const date = new Date(receipt.createdAt).toISOString().split("T")[0];
    return `${receipt.receiptNumber || receipt.id}_${date}_${receipt.total}`;
  }

  /**
   * Compare receipt data fields
   */
  compareReceiptData(oldReceipt, newReceipt) {
    const differences = [];

    // Compare basic fields
    const fieldsToCompare = [
      "total",
      "subtotal",
      "tax",
      "discount",
      "customerId",
      "cashierId",
      "status",
    ];

    for (const field of fieldsToCompare) {
      if (oldReceipt[field] !== newReceipt[field]) {
        differences.push({
          field,
          old: oldReceipt[field],
          new: newReceipt[field],
        });
      }
    }

    // Compare items count
    if (oldReceipt.items?.length !== newReceipt.items?.length) {
      differences.push({
        field: "itemsCount",
        old: oldReceipt.items?.length || 0,
        new: newReceipt.items?.length || 0,
      });
    }

    // Compare payments count
    if (oldReceipt.payments?.length !== newReceipt.payments?.length) {
      differences.push({
        field: "paymentsCount",
        old: oldReceipt.payments?.length || 0,
        new: newReceipt.payments?.length || 0,
      });
    }

    return differences;
  }

  /**
   * Import receipts to new server
   */
  async importReceipts(receipts, batchSize = 10) {
    const results = {
      success: [],
      failed: [],
      summary: {
        total: receipts.length,
        successful: 0,
        failed: 0,
      },
    };

    // Process in batches
    for (let i = 0; i < receipts.length; i += batchSize) {
      const batch = receipts.slice(i, i + batchSize);
      console.log(
        `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(receipts.length / batchSize)}`,
      );

      const batchPromises = batch.map(async (receipt) => {
        try {
          // Transform receipt data for new server format
          const transformedReceipt = this.transformReceiptForImport(receipt);

          // Import to new server (replace with your actual import endpoint)
          const response = await axios.post(
            `${this.baseUrl}/api/receipts/import`,
            transformedReceipt,
          );

          results.success.push({
            receiptId: receipt.id,
            newId: response.data.id,
          });
          results.summary.successful++;

          return { success: true, receiptId: receipt.id };
        } catch (error) {
          console.error(
            `Failed to import receipt ${receipt.id}:`,
            error.message,
          );
          results.failed.push({
            receiptId: receipt.id,
            error: error.message,
          });
          results.summary.failed++;

          return {
            success: false,
            receiptId: receipt.id,
            error: error.message,
          };
        }
      });

      await Promise.allSettled(batchPromises);

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * Transform receipt data for import to new server
   */
  transformReceiptForImport(oldReceipt) {
    return {
      receiptNumber: oldReceipt.receiptNumber,
      createdAt: oldReceipt.createdAt,
      total: oldReceipt.total,
      subtotal: oldReceipt.subtotal,
      tax: oldReceipt.tax,
      discount: oldReceipt.discount,
      customerId: oldReceipt.customerId,
      cashierId: oldReceipt.cashierId,
      status: oldReceipt.status,
      notes: oldReceipt.notes,
      tableNumber: oldReceipt.tableNumber,
      orderType: oldReceipt.orderType,

      items:
        oldReceipt.items?.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
          discount: item.discount || 0,
          tax: item.tax || 0,
          category: item.category,
        })) || [],

      payments:
        oldReceipt.payments?.map((payment) => ({
          type: payment.payment_type || payment.type,
          amount: payment.money_amount || payment.amount,
          paymentTypeName: payment.payment_type_name || payment.name,
          paidMoney: payment.paid_money || payment.money_amount,
          change: payment.change || 0,
        })) || [],

      // Metadata
      importedFrom: "old-pos-system",
      importTimestamp: new Date().toISOString(),
      originalId: oldReceipt.id,
    };
  }

  /**
   * Main migration function
   */
  async runMigration(options = {}) {
    const { startDate, endDate, batchSize = 50, compareOnly = false } = options;

    console.log("Starting receipts migration...");
    console.log(`Date range: ${startDate || "all"} to ${endDate || "all"}`);

    try {
      // Step 1: Fetch all receipts from old system
      console.log("Step 1: Fetching receipts from old system...");
      const allReceipts = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const response = await this.fetchReceipts({
          startDate,
          endDate,
          limit: 1000,
          offset,
          format: "full",
        });

        allReceipts.push(...response.data.receipts);
        hasMore = response.data.hasMore;
        offset += response.data.limit;

        console.log(`Fetched ${allReceipts.length} receipts so far...`);

        if (allReceipts.length >= 10000) {
          // Safety limit
          console.warn(
            "Reached safety limit of 10,000 receipts. Use date ranges for larger datasets.",
          );
          break;
        }
      }

      console.log(`Total receipts fetched: ${allReceipts.length}`);

      if (compareOnly) {
        // Step 2: Compare with new server
        console.log("Step 2: Comparing with new server...");
        const newServerReceipts = await this.fetchNewServerReceipts(
          startDate,
          endDate,
        );
        const comparison = await this.compareReceipts(
          allReceipts,
          newServerReceipts,
        );

        console.log("Comparison Results:");
        console.log(`- Matched: ${comparison.summary.matched}`);
        console.log(`- Missing: ${comparison.summary.missing}`);
        console.log(`- Different: ${comparison.summary.different}`);

        // Save comparison report
        await this.saveReport("comparison-report.json", comparison);

        return comparison;
      } else {
        // Step 2: Import receipts
        console.log("Step 2: Importing receipts to new server...");
        const importResults = await this.importReceipts(allReceipts, batchSize);

        console.log("Import Results:");
        console.log(`- Successful: ${importResults.summary.successful}`);
        console.log(`- Failed: ${importResults.summary.failed}`);

        // Save import report
        await this.saveReport("import-report.json", importResults);

        return importResults;
      }
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  }

  /**
   * Fetch receipts from new server for comparison
   */
  async fetchNewServerReceipts(startDate, endDate) {
    // Implement based on your new server API
    // This is a placeholder - replace with actual new server endpoint
    try {
      const response = await axios.get(`${this.baseUrl}/api/receipts`, {
        params: { startDate, endDate },
      });
      return response.data.receipts || [];
    } catch (error) {
      console.warn(
        "Could not fetch receipts from new server for comparison:",
        error.message,
      );
      return [];
    }
  }

  /**
   * Save report to file
   */
  async saveReport(filename, data) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filepath = `${timestamp}_${filename}`;

    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Report saved to: ${filepath}`);
  }
}

// Usage examples:

// Compare receipts without importing
async function compareReceipts() {
  const checker = new ReceiptsChecker(
    "https://your-old-pos-domain.com",
    "your-migration-key",
  );

  const result = await checker.runMigration({
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    compareOnly: true,
  });

  console.log("Comparison completed");
}

// Import receipts
async function importReceipts() {
  const checker = new ReceiptsChecker(
    "https://your-old-pos-domain.com",
    "your-migration-key",
  );

  const result = await checker.runMigration({
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    batchSize: 25,
  });

  console.log("Import completed");
}

// Fetch specific receipts
async function fetchSpecificReceipts() {
  const checker = new ReceiptsChecker("https://your-old-pos-domain.com");

  const result = await checker.fetchReceipts({
    receiptIds: ["receipt-1", "receipt-2", "receipt-3"],
    format: "summary",
  });

  console.log(`Fetched ${result.data.receipts.length} receipts`);
}

module.exports = ReceiptsChecker;
```

### Python Example Script

```python
import requests
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
import time

class ReceiptsChecker:
    def __init__(self, base_url: str = 'https://your-pos-domain.com', migration_key: str = None):
        self.base_url = base_url.rstrip('/')
        self.migration_key = migration_key
        self.endpoint = '/api/debug/receipts-checker'

    def fetch_receipts(self, **params) -> Dict[str, Any]:
        """
        Fetch receipts from the old system
        """
        url = f"{self.base_url}{self.endpoint}"

        # Set defaults
        params.setdefault('limit', 100)
        params.setdefault('offset', 0)
        params.setdefault('format', 'full')
        params.setdefault('includePayments', 'true')
        params.setdefault('includeItems', 'true')

        # Add migration key for production access
        if self.migration_key:
            params.setdefault('migration_key', self.migration_key)

        try:
            print(f"Fetching receipts from: {url}")
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            data = response.json()
            if not data.get('success'):
                raise Exception(f"API Error: {data.get('error')}")

            return data
        except requests.exceptions.RequestException as e:
            print(f"Error fetching receipts: {e}")
            raise

    def compare_receipts(self, old_receipts: List[Dict], new_receipts: List[Dict]) -> Dict[str, Any]:
        """
        Compare receipts between old and new systems
        """
        comparison = {
            'matched': [],
            'missing': [],
            'different': [],
            'summary': {
                'total_old': len(old_receipts),
                'total_new': len(new_receipts),
                'matched': 0,
                'missing': 0,
                'different': 0
            }
        }

        # Create lookup map for new receipts
        new_receipts_map = {}
        for receipt in new_receipts:
            key = self._get_receipt_key(receipt)
            new_receipts_map[key] = receipt

        # Compare each old receipt
        for old_receipt in old_receipts:
            key = self._get_receipt_key(old_receipt)
            new_receipt = new_receipts_map.get(key)

            if not new_receipt:
                comparison['missing'].append({
                    'old_receipt': old_receipt,
                    'reason': 'Not found in new server'
                })
                comparison['summary']['missing'] += 1
            else:
                differences = self._compare_receipt_data(old_receipt, new_receipt)
                if not differences:
                    comparison['matched'].append({
                        'old_receipt': old_receipt,
                        'new_receipt': new_receipt
                    })
                    comparison['summary']['matched'] += 1
                else:
                    comparison['different'].append({
                        'old_receipt': old_receipt,
                        'new_receipt': new_receipt,
                        'differences': differences
                    })
                    comparison['summary']['different'] += 1

        return comparison

    def _get_receipt_key(self, receipt: Dict) -> str:
        """Generate unique key for receipt comparison"""
        date = receipt.get('createdAt', '').split('T')[0] if receipt.get('createdAt') else ''
        receipt_num = receipt.get('receiptNumber') or receipt.get('id', '')
        total = receipt.get('total', 0)
        return f"{receipt_num}_{date}_{total}"

    def _compare_receipt_data(self, old: Dict, new: Dict) -> List[Dict]:
        """Compare receipt data fields"""
        differences = []

        fields_to_compare = [
            'total', 'subtotal', 'tax', 'discount',
            'customerId', 'cashierId', 'status'
        ]

        for field in fields_to_compare:
            if old.get(field) != new.get(field):
                differences.append({
                    'field': field,
                    'old': old.get(field),
                    'new': new.get(field)
                })

        # Compare items count
        old_items = old.get('items', []) or []
        new_items = new.get('items', []) or []
        if len(old_items) != len(new_items):
            differences.append({
                'field': 'items_count',
                'old': len(old_items),
                'new': len(new_items)
            })

        # Compare payments count
        old_payments = old.get('payments', []) or []
        new_payments = new.get('payments', []) or []
        if len(old_payments) != len(new_payments):
            differences.append({
                'field': 'payments_count',
                'old': len(old_payments),
                'new': len(new_payments)
            })

        return differences

    def import_receipts(self, receipts: List[Dict], batch_size: int = 10) -> Dict[str, Any]:
        """
        Import receipts to new server
        """
        results = {
            'success': [],
            'failed': [],
            'summary': {
                'total': len(receipts),
                'successful': 0,
                'failed': 0
            }
        }

        for i in range(0, len(receipts), batch_size):
            batch = receipts[i:i + batch_size]
            print(f"Processing batch {i//batch_size + 1}/{len(receipts)//batch_size + 1}")

            for receipt in batch:
                try:
                    transformed = self._transform_receipt_for_import(receipt)

                    # Import to new server (replace with your actual endpoint)
                    response = requests.post(
                        f"{self.base_url}/api/receipts/import",
                        json=transformed,
                        timeout=30
                    )
                    response.raise_for_status()

                    results['success'].append({
                        'receipt_id': receipt['id'],
                        'new_id': response.json().get('id')
                    })
                    results['summary']['successful'] += 1

                except Exception as e:
                    print(f"Failed to import receipt {receipt['id']}: {e}")
                    results['failed'].append({
                        'receipt_id': receipt['id'],
                        'error': str(e)
                    })
                    results['summary']['failed'] += 1

            # Small delay between batches
            time.sleep(1)

        return results

    def _transform_receipt_for_import(self, receipt: Dict) -> Dict:
        """Transform receipt data for new server format"""
        return {
            'receiptNumber': receipt.get('receiptNumber'),
            'createdAt': receipt.get('createdAt'),
            'total': receipt.get('total', 0),
            'subtotal': receipt.get('subtotal', 0),
            'tax': receipt.get('tax', 0),
            'discount': receipt.get('discount', 0),
            'customerId': receipt.get('customerId'),
            'cashierId': receipt.get('cashierId'),
            'status': receipt.get('status', 'completed'),
            'notes': receipt.get('notes'),
            'tableNumber': receipt.get('tableNumber'),
            'orderType': receipt.get('orderType'),

            'items': [
                {
                    'productId': item.get('productId'),
                    'name': item.get('name'),
                    'quantity': item.get('quantity', 1),
                    'price': item.get('price', 0),
                    'total': item.get('total', 0),
                    'discount': item.get('discount', 0),
                    'tax': item.get('tax', 0),
                    'category': item.get('category')
                }
                for item in receipt.get('items', [])
            ],

            'payments': [
                {
                    'type': payment.get('payment_type') or payment.get('type'),
                    'amount': payment.get('money_amount') or payment.get('amount', 0),
                    'paymentTypeName': payment.get('payment_type_name') or payment.get('name'),
                    'paidMoney': payment.get('paid_money') or payment.get('money_amount', 0),
                    'change': payment.get('change', 0)
                }
                for payment in receipt.get('payments', [])
            ],

            'importedFrom': 'old-pos-system',
            'importTimestamp': datetime.now().isoformat(),
            'originalId': receipt.get('id')
        }

    def run_migration(self, start_date: str = None, end_date: str = None,
                     batch_size: int = 50, compare_only: bool = False) -> Dict[str, Any]:
        """
        Main migration function
        """
        print("Starting receipts migration...")
        print(f"Date range: {start_date or 'all'} to {end_date or 'all'}")

        try:
            # Step 1: Fetch all receipts from old system
            print("Step 1: Fetching receipts from old system...")
            all_receipts = []
            offset = 0
            has_more = True

            while has_more:
                response = self.fetch_receipts(
                    startDate=start_date,
                    endDate=end_date,
                    limit=1000,
                    offset=offset,
                    format='full'
                )

                all_receipts.extend(response['data']['receipts'])
                has_more = response['data']['hasMore']
                offset += response['data']['limit']

                print(f"Fetched {len(all_receipts)} receipts so far...")

                if len(all_receipts) >= 10000:  # Safety limit
                    print("Reached safety limit of 10,000 receipts. Use date ranges for larger datasets.")
                    break

            print(f"Total receipts fetched: {len(all_receipts)}")

            if compare_only:
                # Step 2: Compare with new server
                print("Step 2: Comparing with new server...")
                new_receipts = self._fetch_new_server_receipts(start_date, end_date)
                comparison = self.compare_receipts(all_receipts, new_receipts)

                print("Comparison Results:")
                print(f"- Matched: {comparison['summary']['matched']}")
                print(f"- Missing: {comparison['summary']['missing']}")
                print(f"- Different: {comparison['summary']['different']}")

                self._save_report('comparison-report.json', comparison)
                return comparison
            else:
                # Step 2: Import receipts
                print("Step 2: Importing receipts to new server...")
                import_results = self.import_receipts(all_receipts, batch_size)

                print("Import Results:")
                print(f"- Successful: {import_results['summary']['successful']}")
                print(f"- Failed: {import_results['summary']['failed']}")

                self._save_report('import-report.json', import_results)
                return import_results

        except Exception as e:
            print(f"Migration failed: {e}")
            raise

    def _fetch_new_server_receipts(self, start_date: str, end_date: str) -> List[Dict]:
        """Fetch receipts from new server for comparison"""
        try:
            response = requests.get(f"{self.base_url}/api/receipts", params={
                'startDate': start_date,
                'endDate': end_date
            }, timeout=30)
            response.raise_for_status()
            return response.json().get('receipts', [])
        except Exception as e:
            print(f"Could not fetch receipts from new server for comparison: {e}")
            return []

    def _save_report(self, filename: str, data: Dict[str, Any]):
        """Save report to file"""
        timestamp = datetime.now().isoformat().replace(':', '-').replace('.', '-')
        filepath = f"{timestamp}_{filename}"

        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2, default=str)

        print(f"Report saved to: {filepath}")

# Usage examples:

def compare_receipts():
    checker = ReceiptsChecker('https://your-old-pos-domain.com', 'your-migration-key')

    result = checker.run_migration(
        start_date='2024-01-01',
        end_date='2024-01-31',
        compare_only=True
    )

    print("Comparison completed")

def import_receipts():
    checker = ReceiptsChecker('https://your-old-pos-domain.com', 'your-migration-key')

    result = checker.run_migration(
        start_date='2024-01-01',
        end_date='2024-01-31',
        batch_size=25
    )

    print("Import completed")

def fetch_specific_receipts():
    checker = ReceiptsChecker('https://your-old-pos-domain.com')

    result = checker.fetch_receipts(
        receiptIds=['receipt-1', 'receipt-2', 'receipt-3'],
        format='summary'
    )

    print(f"Fetched {len(result['data']['receipts'])} receipts")

if __name__ == "__main__":
    # Run comparison
    compare_receipts()

    # Or run import
    # import_receipts()
```

## Migration Strategy

### Phase 1: Data Assessment

1. Use the API with `format=summary` to quickly assess data volume
2. Compare date ranges to understand data distribution
3. Identify any data quality issues

### Phase 2: Comparison Testing

1. Run comparison mode (`compareOnly=true`) on sample data
2. Review comparison reports to identify discrepancies
3. Adjust data transformation logic as needed

### Phase 3: Incremental Import

1. Import data in date range batches (e.g., weekly or monthly)
2. Use smaller batch sizes initially to monitor performance
3. Validate imported data after each batch

### Phase 4: Full Migration

1. Run full import with appropriate batch sizes
2. Monitor system performance during import
3. Generate final validation reports

## Best Practices

### Error Handling

- Always check the `success` field in API responses
- Implement retry logic for failed imports
- Log detailed error information for troubleshooting

### Performance Optimization

- Use appropriate batch sizes (start with 10-25, increase as needed)
- Implement rate limiting to avoid overwhelming servers
- Use date ranges to process data in manageable chunks

### Data Validation

- Compare key fields (totals, dates, customer IDs) first
- Validate payment and item data integrity
- Check for duplicate receipts before importing

### Monitoring

- Log all API requests and responses
- Track import success/failure rates
- Monitor server performance during migration

## Troubleshooting

### Common Issues

1. **API Timeout**: Increase timeout values or reduce batch sizes
2. **Memory Issues**: Process data in smaller chunks
3. **Rate Limiting**: Add delays between requests
4. **Data Format Issues**: Check API response format and adjust parsing logic

### Debug Information

The API provides detailed debug information in the response:

- `requestId`: Unique identifier for tracking requests
- `processingTime`: Server-side processing time
- `receiptsFound`: Total receipts matching criteria
- `receiptsReturned`: Receipts in current response

Use this information to optimize your migration scripts and troubleshoot issues.
