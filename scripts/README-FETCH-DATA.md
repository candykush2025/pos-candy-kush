# Receipt Data Fetcher - Usage Guide

## Purpose

This script fetches **real receipt data** from Loyverse API and saves it to `DataMapping.md` with detailed analysis to help determine the correct calculation method.

## Quick Start

### 1. Make sure your Loyverse API token is configured

Check your `.env.local` file has:

```
NEXT_PUBLIC_LOYVERSE_API_TOKEN=your_actual_token_here
```

### 2. Run the script

```powershell
node scripts/fetch-receipt-data.js
```

### 3. Check the output

The script will:

- ✅ Fetch 5 recent receipts from Loyverse
- ✅ Analyze the data structure
- ✅ Calculate totals in two ways (raw and ÷100)
- ✅ Save everything to `DataMapping.md`
- ✅ Show verification steps

## What the Script Does

### 1. Fetches Real Data

```
🔄 Fetching receipts from Loyverse API...
✅ Fetched 5 receipts
```

### 2. Analyzes Each Receipt

- Basic info (receipt number, date, type)
- **Financial data** (total_money, tax, discount)
- **Calculation checks** (raw value vs ÷100)
- Line items with prices
- Payment methods
- Complete JSON structure

### 3. Creates Comparison Guide

The script shows:

```
total_money: 8000
As Baht (no conversion): ฿8000
As Satang → Baht (÷100): ฿80
```

Then you compare with your Loyverse dashboard to see which is correct!

## Verification Steps (From Output)

1. **Open Loyverse Dashboard** in your browser
2. **Go to Receipts** → Find the first receipt number
3. **Check the total amount** shown in Loyverse
4. **Compare** with the `total_money` value in DataMapping.md

### If they match:

```javascript
// Values are already in Baht - NO DIVISION NEEDED
const monthRevenue = monthReceipts.reduce(
  (sum, receipt) => sum + (receipt.totalMoney || 0),
  0
); // ✅ Use directly
```

### If Loyverse shows 1/100th:

```javascript
// Values are in satang - DIVIDE BY 100
const monthRevenue =
  monthReceipts.reduce((sum, receipt) => sum + (receipt.totalMoney || 0), 0) /
  100; // ✅ Divide by 100
```

## Output File Structure

### DataMapping.md will contain:

```markdown
# Loyverse Receipt Data Analysis

## Revenue Analysis

- Raw sum of all receipts
- Divided by 100 version
- How to verify which is correct

## Receipt 1: [Number]

### Basic Info

- Receipt number, date, type

### Financial Data (CRITICAL)

- total_money: 8000
- Calculation checks

### Line Items

- Each item with prices and totals

### Payments

- Payment methods and amounts

### Complete JSON

- Full receipt object

## Summary Table

- All receipts in a table format
```

## Troubleshooting

### Error: "LOYVERSE_API_TOKEN not set"

**Solution:**

1. Create `.env.local` file in project root
2. Add: `NEXT_PUBLIC_LOYVERSE_API_TOKEN=your_token`
3. Run script again

### Error: "Loyverse API error: 401"

**Solution:**

- Your API token is invalid or expired
- Generate a new token from Loyverse dashboard
- Update `.env.local`

### Error: "No receipts found"

**Solution:**

- Make sure you have receipts in your Loyverse account
- Check if receipts are from recent dates
- The script fetches the 5 most recent receipts

## Example Output

```
🚀 Starting Loyverse Receipt Data Fetch...

🔄 Fetching receipts from Loyverse API...
✅ Fetched 5 receipts

✅ SUCCESS!
📄 Data saved to: C:\...\DataMapping.md
📊 Total receipts: 5
💰 Total revenue (raw): 40000
💰 Total revenue (÷100): 400

🔍 Next steps:
1. Open DataMapping.md
2. Check the "VERIFICATION STEPS" section
3. Compare Loyverse dashboard amounts with total_money values
4. Update dashboard calculations accordingly
```

## After Running

1. **Open** `DataMapping.md`
2. **Read** the "VERIFICATION STEPS" section
3. **Compare** the values with Loyverse dashboard
4. **Update** dashboard code based on findings
5. **Test** with real data

## Benefits

- ✅ See **real data** from your Loyverse account
- ✅ Compare **raw values** vs **divided by 100**
- ✅ Get **verification steps** to determine correct method
- ✅ See **complete receipt structure** for reference
- ✅ Understand **line items** and **payment** data

---

**Created**: October 18, 2025  
**Purpose**: Determine correct Loyverse data calculation method  
**Location**: `scripts/fetch-receipt-data.js`
