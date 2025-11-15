# Thermal Printing Documentation Using PosSalesSlip.java

This documentation provides a guide on how to use the `PosSalesSlip.java` class for thermal printing in a POS (Point of Sale) system. The class is designed to work with thermal printers using the SmartPos SDK.

## Overview

The `PosSalesSlip` class is a printing template that handles the formatting and printing of sales receipts on thermal printers. It supports various features including:

- Text printing in multiple languages
- Logo printing
- QR code generation
- Barcode printing
- Table formatting
- Multi-column layouts
- Bitmap printing for complex layouts

## Prerequisites

- Android application with SmartPos SDK integration
- Thermal printer connected via USB or serial port
- PrinterManager instance from the SmartPos SDK

## Basic Usage

### 1. Initialize the Printer

```java
// Create PrinterManager instance (implementation depends on your setup)
PrinterManager printerManager = new PrinterManager();

// Create PosSalesSlip instance
PosSalesSlip salesSlip = new PosSalesSlip(context, printerManager);
```

### 2. Set Transaction Data

Set all the required fields before printing:

```java
salesSlip.setMerchantName("Your Store Name");
salesSlip.setMerchantNo("123456789");
salesSlip.setTerminalNo("TERM001");
salesSlip.setOperatorNo("OP001");
salesSlip.setIssuer("Visa");
salesSlip.setCardNo("**** **** **** 1234");
salesSlip.setTxnType("Purchase");
salesSlip.setBatchNo("001");
salesSlip.setVoucherNo("123456");
salesSlip.setAuthNo("789012");
salesSlip.setExpDate("12/25");
salesSlip.setRefNo("REF123456789");
salesSlip.setDate("2025-11-15 14:30:00");
salesSlip.setAmount("$25.99");
```

### 3. Validate Data

Before printing, validate that all required fields are set:

```java
if (!salesSlip.validate()) {
    // Handle validation error
    return;
}
```

### 4. Prepare Printer

Initialize and check the printer:

```java
int result = salesSlip.prepare();
if (result != 0) {
    // Handle printer preparation error
    return;
}
```

### 5. Print the Receipt

Execute the printing process:

```java
try {
    salesSlip.print();
} catch (SmartPosException e) {
    // Handle printing error
}
```

### 6. Clean Up

Disconnect the printer:

```java
salesSlip.destroy();
```

## Advanced Features

### Custom Heating Parameters

The class automatically adjusts heating parameters based on printer type, but you can customize them:

```java
// For slow printers
printerManager.cmdSetHeatingParam(7, 140, 2);

// For fast printers
printerManager.cmdSetHeatingParam(15, 100, 10);
```

### Language Support

The printer supports multiple code pages for different languages:

```java
// Set encoding for Chinese
printerManager.setStringEncoding("GB18030");
printerManager.cmdSetPrinterLanguage(PrinterManager.CODE_PAGE_GB18030);

// Set encoding for Russian
printerManager.setStringEncoding("CP1251");
printerManager.cmdSetPrinterLanguage(PrinterManager.CODE_PAGE_CP1251);
```

### Printing Modes

Various print modes are supported:

```java
// Double height and width with emphasis
printerManager.cmdSetPrintMode(PrinterManager.FONT_DOUBLE_HEIGHT |
                              PrinterManager.FONT_DOUBLE_WIDTH |
                              PrinterManager.FONT_EMPHASIZED);

// Upside down and underlined
printerManager.cmdSetPrintMode(PrinterManager.FONT_UPSIDE_DOWN |
                              PrinterManager.FONT_UNDERLINE);

// Inverse colors (white text on black background)
printerManager.cmdSetPrintMode(PrinterManager.FONT_INVERSE);
```

### QR Code Printing

Print QR codes with custom error correction:

```java
String qrData = "https://www.example.com";
printerManager.cmdQrCodePrint(8, PrinterManager.QR_ECC_LEVEL_M, qrData);
```

### Barcode Printing

Print various barcode types:

```java
String barcodeData = "ABC1234567890";
printerManager.cmdSetBarCodeWidth(2);
printerManager.cmdSetBarCodeHeight(80);
printerManager.cmdBarCodePrint(PrinterManager.CODE93, barcodeData);
```

### Table Printing

Create formatted tables with multiple columns:

```java
// Set table offsets (in 12-dot units)
byte[] offsets = new byte[] {(byte)2, (byte)9, (byte)19};
printerManager.cmdSetTable(offsets);

// Print table data
printerManager.cmdJumpTab();
printerManager.sendData("Item");
printerManager.cmdJumpTab();
printerManager.sendData("Qty");
printerManager.cmdJumpTab();
printerManager.sendData("Price");
printerManager.cmdLineFeed();

// Unset table when done
printerManager.cmdUnSetTable();
```

### Bitmap Printing

Print custom bitmaps and logos:

```java
// Load bitmap from resources
Bitmap logo = BitmapFactory.decodeResource(context.getResources(), R.drawable.logo);

// Convert to black and white
Bitmap bwLogo = ImageUtils.bmpToBlackWhite(logo, 215, true);

// Print centered
int xPos = (printerManager.getDotsPerLine() - bwLogo.getWidth()) / 2;
printerManager.cmdBitmapPrint(bwLogo, xPos, 0);
```

## Error Handling

All printing operations can throw `SmartPosException`. Always wrap printing code in try-catch blocks:

```java
try {
    salesSlip.print();
} catch (SmartPosException e) {
    Log.e(TAG, "Printing failed: " + e.getErrorCode());
    // Handle error appropriately
}
```

## Printer Types

The class supports different printer types:

- **Serial Printers**: Built-in printers with power control
- **USB Printers**: External USB-connected printers

The class automatically detects the printer type and adjusts behavior accordingly.

## Paper Management

Always check paper status before printing:

```java
try {
    printerManager.checkPaper();
} catch (SmartPosException e) {
    // Handle paper out error
}
```

## Performance Considerations

- Bitmap printing consumes more power and time
- Adjust heating parameters based on paper quality
- For battery-powered devices, consider skipping bitmap prints when battery is low

## Troubleshooting

### Common Issues

1. **Printing fails**: Check printer connection and paper status
2. **Text encoding issues**: Ensure correct code page is set for the language
3. **Bitmap quality**: Adjust heating parameters and bitmap processing
4. **Alignment problems**: Verify printer dots per line and alignment settings

### Debug Information

Enable logging to troubleshoot issues:

```java
Log.d(TAG, "Printer type: " + printerManager.getPrinterType());
Log.d(TAG, "Dots per line: " + printerManager.getDotsPerLine());
```

## Complete Example

```java
public void printReceipt(Context context, PrinterManager printer) {
    PosSalesSlip slip = new PosSalesSlip(context, printer);

    // Set transaction data
    slip.setMerchantName("Candy Kush POS");
    slip.setMerchantNo("123456");
    slip.setTerminalNo("TERM001");
    slip.setDate("2025-11-15");
    slip.setAmount("$50.00");
    // ... set other fields

    if (!slip.validate()) {
        Log.e(TAG, "Invalid data");
        return;
    }

    int prepareResult = slip.prepare();
    if (prepareResult != 0) {
        Log.e(TAG, "Printer prepare failed: " + prepareResult);
        return;
    }

    try {
        slip.print();
    } catch (SmartPosException e) {
        Log.e(TAG, "Printing failed", e);
    } finally {
        slip.destroy();
    }
}
```

This documentation covers the basic and advanced usage of the PosSalesSlip class for thermal printing. For more detailed API information, refer to the SmartPos SDK documentation.
