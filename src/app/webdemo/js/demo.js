function print_demo() {
  const FULL_CUT = 0;
  const HALF_CUT = 1;

  const ALIGN_LEFT = 0;
  const ALIGN_MIDDLE = 1;
  const ALIGN_RIGHT = 2;

  const FONT_DEFAULT = 0; //12x24
  const FONT_SMALL = 1 << 0; //9x17
  const FONT_INVERSE = 1 << 1;
  const FONT_UPSIDE_DOWN = 1 << 2;
  const FONT_EMPHASIZED = 1 << 3;
  const FONT_DOUBLE_HEIGHT = 1 << 4;
  const FONT_DOUBLE_WIDTH = 1 << 5;
  const FONT_ROTATE = 1 << 6;
  const FONT_UNDERLINE = 1 << 7;

  const UNDERLINE_ZERO = 0;
  const UNDERLINE_HIGH_1 = 1;
  const UNDERLINE_HIGH_2 = 2;

  const CODEBAR_STRING_MODE_NONE = 0;
  const CODEBAR_STRING_MODE_ABOVE = 1;
  const CODEBAR_STRING_MODE_BELOW = 2;
  const CODEBAR_STRING_MODE_BOTH = 3;
  const CODEBAR_STRING_FONT_A = 0;
  const CODEBAR_STRING_FONT_B = 1;

  const UPC_A = 65;
  const UPC_E = 66;
  const EAN13 = 67;
  const EAN8 = 68;
  const CODE39 = 69;
  const I25 = 70;
  const CODEBAR = 71;
  const CODE93 = 72;
  const CODE128 = 73;
  const CODE11 = 74;
  const MSI = 75;

  const QR_ECC_LEVEL_L = 1;
  const QR_ECC_LEVEL_M = 2;
  const QR_ECC_LEVEL_Q = 3;
  const QR_ECC_LEVEL_H = 4;

  const CODE_PAGE_CP437 = 0; //English
  const CODE_PAGE_KATAKANA = 1; //Janpanese
  const CODE_PAGE_CP850 = 2; //Western Europe
  const CODE_PAGE_CP860 = 3; //Portuguese
  const CODE_PAGE_CP863 = 4; //Canadian-French
  const CODE_PAGE_CP865 = 5; //Nordic
  const CODE_PAGE_CP1251 = 6; //Cyrillic
  const CODE_PAGE_CP866 = 7; //Cyrillic2
  const CODE_PAGE_MIK = 8; //Cyrillic,Bulgarian
  const CODE_PAGE_CP755 = 9; //East Europe, Latvian2
  const CODE_PAGE_IRAN = 10; //Iran System encoding standard
  const CODE_PAGE_CP862 = 15; //Hebrew
  const CODE_PAGE_CP1252 = 16; //Latin1
  const CODE_PAGE_CP1253 = 17; //Greek
  const CODE_PAGE_CP852 = 18; //Latin2
  const CODE_PAGE_CP858 = 19; //West Europe
  const CODE_PAGE_IRAN2 = 20; //Iran2
  const CODE_PAGE_LATVIAN = 21; //Latvian
  const CODE_PAGE_CP864 = 22; //Arabic
  const CODE_PAGE_ISO_8859_1 = 23; //West Europe
  const CODE_PAGE_CP737 = 24; //Greek
  const CODE_PAGE_CP1257 = 25; //Baltic
  const CODE_PAGE_THAI = 26; //Thai1
  const CODE_PAGE_CP720 = 27; //Arabic
  const CODE_PAGE_CP855 = 28; //Cyrillic script
  const CODE_PAGE_CP857 = 29; //Turkish
  const CODE_PAGE_CP1250 = 30; //Central Europe
  const CODE_PAGE_CP775 = 31; //Estonian, Lithuanian, Latvian
  const CODE_PAGE_CP1254 = 32; //Turkish
  const CODE_PAGE_CP1255 = 33; //Hebrew
  const CODE_PAGE_CP1256 = 34; //Arabic
  const CODE_PAGE_CP1258 = 35; //Vietnamese
  const CODE_PAGE_ISO_8859_2 = 36; //Latin2
  const CODE_PAGE_ISO_8859_3 = 37; //Latin3
  const CODE_PAGE_ISO_8859_4 = 38; //Baltic
  const CODE_PAGE_ISO_8859_5 = 39; //Cyrillic
  const CODE_PAGE_ISO_8859_6 = 40; //Arabic
  const CODE_PAGE_ISO_8859_7 = 41; //Greek
  const CODE_PAGE_ISO_8859_8 = 42; //Hebrew
  const CODE_PAGE_ISO_8859_9 = 43; //Turkish
  const CODE_PAGE_ISO_8859_15 = 44; //Latin9
  const CODE_PAGE_THAI2 = 45; //Thai2
  const CODE_PAGE_CP856 = 46; //Hebrew
  const CODE_PAGE_CP874 = 47; //Thai

  const CODE_PAGE_SHIFT_JIS = 96;
  const CODE_PAGE_EUC_KR = 97;
  const CODE_PAGE_BIG5 = 98; //Traditional Chinese
  const CODE_PAGE_GB18030 = 99; //Simplified Chinese

  const BITMAP_ZOOM_NONE = 0;
  const BITMAP_ZOOM_WIDTH = 1;
  const BITMAP_ZOOM_HEIGHT = 2;
  const BITMAP_ZOOM_BOTH = 3;

  const printer = new Printer();
  printer.ws.onmessage = function (msg) {
    var json = JSON.parse(msg.data);
    var dev = json.dev;
    var cmd = json.cmd;
    var ack = json.ack;
    if (dev == "printer") {
      if (
        cmd == "connectBuiltinPrinter" ||
        cmd == "connectSerialPrinter" ||
        cmd == "connectUsbPrinter"
      ) {
        if (ack == "true") {
          printer.checkPaper();
        } else {
          printer.disconnect();
          printer.ws.close();
        }
      } else if (cmd == "checkPaper") {
        if (ack == "true") {
          //printer.cmdSetHeatingParam(15, 120, 10);
          //print unsupport language by bitmap
          printer.printLineComboByBitmap("English", "Hello World");
          printer.printLineComboByBitmap("Arabic", "مرحبا بالعالم");
          printer.printLineComboByBitmap("Malayalam", "ഹലോ വേൾഡ്");
          printer.printLineComboByBitmap("Hindi", "नमस्ते दुनिया");
          printer.printLineComboByBitmap("Turkish", "Selam Dünya");
          printer.printLineComboByBitmap("Hebrew", "שלום עולם");
          printer.printLineComboByBitmap("Japanese", "こんにちは世界");
          printer.printLineComboByBitmap("Korean", "안녕 세상");
          printer.printLineComboByBitmap("Thai", "สวัสดีชาวโลก");
          printer.printLineComboByBitmap("Vietnamese", "Chào thế giới");
          printer.printLineComboByBitmap("Burmese", "မင်္ဂလာပါကမ္ဘာလောက");
          printer.cmdLineFeed(1);
          //language test
          printer.cmdSetAlignMode(ALIGN_LEFT);
          printer.setStringEncoding("CP437");
          printer.cmdSetPrinterLanguage(CODE_PAGE_CP437);
          printer.printLineCombo("English", "Hello World");
          printer.printLineCombo("German", "Hallo Welt");
          printer.printLineCombo("French", "Bonjour le monde");

          printer.setStringEncoding("CP1251");
          printer.cmdSetPrinterLanguage(CODE_PAGE_CP1251);
          printer.printLineCombo("Russian", "Привет мир");

          printer.setStringEncoding("CP775");
          printer.cmdSetPrinterLanguage(CODE_PAGE_CP775);
          printer.printLineCombo("Latvian", "Sveiki Pasaule");

          printer.setStringEncoding("ISO-8859-2");
          printer.cmdSetPrinterLanguage(CODE_PAGE_ISO_8859_2);
          printer.printLineCombo("Romanian", "Bună ziua lumea");

          printer.setStringEncoding("GB18030");
          printer.cmdSetPrinterLanguage(CODE_PAGE_GB18030);
          printer.printLineCombo("Chinese", "你好世界");

          //printer.cmdSetHeatingParam(7, 120, 10);
          if (printer.type == "serial") {
            //print logo form NVRAM
            printer.cmdSetAlignMode(ALIGN_MIDDLE);
            printer.cmdPrintBitmapFromNVRAM(1, BITMAP_ZOOM_NONE); //logo.bmp
            printer.cmdPrintBitmapFromNVRAM(2, BITMAP_ZOOM_NONE); //logo_large.bmp
            printer.cmdLineFeed();
            //print logo directly
            printer.cmdBitmapPrint("Download/logo.bmp", 48, 0); //58: (384-288)/2=48
            printer.cmdBitmapPrint("Download/logo_large.bmp", 0, 0);
            printer.cmdLineFeed();
          } else {
            //print logo directly
            printer.cmdBitmapPrint("Download/logo.bmp", 144, 0); //80mm: (576-288)/2=144
            printer.cmdBitmapPrint("Download/logo_large.bmp", 96, 0); //80mm: (576-384)/2=96
            printer.cmdLineFeed();
          }
          //restore heating parameter
          //printer.cmdSetHeatingParam(15, 110, 10);

          //print template
          const merchantName = "CocoPark";
          const merchantNo = "102510154110045";
          const terminalNo = "10095066";
          const operatorNo = "01";
          const issuer = "03050001";
          const cardNo = "622602******9376";
          const txnType = "SALE";
          const batchNo = "000814";
          const voucherNo = "003707";
          const authNo = "381936";
          const expDate = "0000";
          const refNo = "103758494052";
          const date = "2012-11-25 10:37:58";
          const amount = "67.10";

          const lang = navigator.language;
          if (lang == "zh-CN") {
            printer.cmdSetPrinterLanguage(CODE_PAGE_GB18030);
            printer.setStringEncoding("GB18030");
          } else {
            printer.cmdSetPrinterLanguage(CODE_PAGE_CP437);
            printer.setStringEncoding("CP437");
          }
          //set font style for title
          printer.cmdSetPrintMode(
            FONT_DOUBLE_HEIGHT | FONT_DOUBLE_WIDTH | FONT_EMPHASIZED
          );
          printer.cmdSetAlignMode(ALIGN_MIDDLE);
          if (lang == "zh-CN") {
            //title
            printer.printLine("POS 签购单");
            //restore default font style and align mode
            printer.cmdSetPrintMode(FONT_DEFAULT);
            printer.cmdSetAlignMode(ALIGN_LEFT);
            //header
            printer.printLine("商户存根联，请妥善保管");
            printer.printDevidingLine();
            //content
            printer.printLineCombo("商户名称", merchantName);
            printer.printLineCombo("商户号", merchantNo);
            printer.printLineCombo("终端号", terminalNo);
            printer.printLineCombo("日期", date);
            printer.printLineCombo("发卡行", issuer);
            printer.printLineCombo("卡号", cardNo);
            printer.printLineCombo("有效期", expDate);
            printer.printLineCombo("交易类型", txnType);
            printer.printLineCombo("批次号", batchNo);
            printer.printLineCombo("凭证号", voucherNo);
            printer.printLineCombo("参考号", refNo);
            printer.printLineCombo("授权号", authNo);
            printer.printLineCombo("操作员", operatorNo);
            printer.printLineCombo("金额", amount);
            printer.printLine("备注");
            printer.printDevidingLine();
            printer.printLine("谢谢惠顾，欢迎下次光临");
          } else {
            //title
            printer.printLine("POS SALES SLIP");
            //restore default font style and align mode
            printer.cmdSetPrintMode(FONT_DEFAULT);
            printer.cmdSetAlignMode(ALIGN_LEFT);
            //header
            printer.printLine("MERCHANT STUB");
            printer.printDevidingLine();
            //content
            printer.printLineCombo("MERCHANT NAME", merchantName);
            printer.printLineCombo("ERCHANT NO.", merchantNo);
            printer.printLineCombo("TERMINAL NO.", terminalNo);
            printer.printLineCombo("DATE", date);
            printer.printLineCombo("ISSUER", issuer);
            printer.printLineCombo("CARD NO.", cardNo);
            printer.printLineCombo("EXP. DATE.", expDate);
            printer.printLineCombo("TXN. TYPE", txnType);
            printer.printLineCombo("BATCH NO.", batchNo);
            printer.printLineCombo("VOUCHER NO.", voucherNo);
            printer.printLineCombo("REF NO.", refNo);
            printer.printLineCombo("AUTH. NO.", authNo);
            printer.printLineCombo("OPERATOR NO.", operatorNo);
            printer.printLineCombo("AMOUNT", amount);
            printer.printLine("REFERENCE");
            printer.printDevidingLine();
            printer.printLine("THANK YOU FOR CHOOSING");
          }
          printer.cmdLineFeed();

          //print QR code
          const qrCoderString = "https://www.pay-device.com";
          printer.cmdQrCodePrint(8, QR_ECC_LEVEL_M, qrCoderString);
          printer.cmdLineFeed();

          //print barcode
          var barCodeString = "ABC1234567890";
          printer.cmdSetBarCodeStringPosition(CODEBAR_STRING_MODE_BELOW);
          printer.cmdSetBarCodeStringSize(CODEBAR_STRING_FONT_A);
          printer.cmdSetBarCodeWidth(2);
          printer.cmdSetBarCodeHeight(50);
          //printer.cmdSetBarCodeLeftSpacing(10);
          printer.cmdBarCodePrint(CODE93, barCodeString);
          printer.cmdLineFeed();

          //print mode test
          printer.cmdSetAlignMode(ALIGN_LEFT);
          printer.cmdSetPrintMode(FONT_UPSIDE_DOWN | FONT_UNDERLINE);
          printer.cmdSetUnderlineHeight(2);
          printer.sendData("upside down and underline");
          printer.cmdLineFeed();

          printer.cmdSetPrintMode(FONT_ROTATE | FONT_EMPHASIZED);
          printer.sendData("rotate");
          printer.cmdLineFeed();

          printer.cmdSetPrintMode(FONT_DEFAULT);
          printer.cmdSetFontScaleSize(1, 1);
          printer.sendData("AaBbCc");
          printer.cmdLineFeed();
          //adjust for inverse
          //printer.cmdSetHeatingParam(7, 140, 2);
          printer.cmdSetPrintMode(FONT_INVERSE | FONT_SMALL);
          printer.sendData("inverse and small");
          printer.cmdLineFeed();

          printer.cmdSetPrintMode(FONT_DEFAULT);
          printer.cmdSetAlignMode(ALIGN_LEFT);
          //print table
          //table have 3 column, offset: 2,9,19 units:12dots
          printer.cmdSetTable("2,9,19"); //set table
          printer.cmdJumpTab(); //jump first offset, just comment out if want print item1 as start of a line.
          printer.sendData("item1");
          printer.cmdJumpTab(); //jump second offset
          printer.sendData("item2");
          printer.cmdJumpTab(); //jump third offset
          printer.sendData("item3");
          printer.cmdLineFeed();

          printer.cmdJumpTab();
          printer.sendData("apple");
          printer.cmdJumpTab();
          printer.sendData("banana");
          printer.cmdJumpTab();
          printer.sendData("cherry");
          printer.cmdLineFeed();
          printer.cmdUnSetTable(); //unset table
          printer.sendData("12345678901234567890123456789012"); //reference line, used to check all offset
          printer.cmdLineFeed();
          //print table by printLine
          var strArr = ["Pizza", "x123", "123.23"];
          var widthArr = [6, 3, 3];
          var alignArr = [0, 2, 2];
          printer.printLineMulti(strArr, widthArr, alignArr);

          //print end
          printer.cmdLineFeed(3);
          if (printer.type == "usb") {
            printer.cmdCutPaper(FULL_CUT);
          }
        } else {
        }
        printer.disconnect();
        printer.ws.close();
      } else if (cmd == "getPrinterType") {
        if (ack == "usb") {
          printer.type = "usb";
        } else {
        }
      }
    }
  };
  printer.ws.onclose = function () {};
  printer.ws.onerror = function (evt) {
    console.log("ws onerror");
  };
  printer.ws.onopen = function () {
    console.log("ws onopen");
    //printer.connectSerialPrinter("/dev/ttyS9", 115200, 58);  // connect external 58mm serialport printer
    //printer.connectUsbPrinter(17992,32768,80);  // connect external 80mm usb printer
    printer.connectBuiltinPrinter(58); // connect built-in 58mm printer
    printer.getPrinterType();
  };
}

function print_save_logo_to_nvram() {
  const printer = new Printer();
  printer.ws.onmessage = function (msg) {
    var json = JSON.parse(msg.data);
    var dev = json.dev;
    var cmd = json.cmd;
    var ack = json.ack;
    if (dev == "printer") {
      if (cmd == "saveBitmaptoNVRAM") {
        if (ack == "true") {
          alert("saveBitmaptoNVRAM success");
        } else {
          alert("saveBitmaptoNVRAM fail");
        }
      }
    }
  };
  printer.ws.onclose = function () {
    console.log("printer onclose");
  };
  printer.ws.onerror = function (evt) {
    console.log("printer onerror");
  };
  printer.ws.onopen = function () {
    console.log("printer onopen");
    printer.connectBuiltinPrinter(58);
    printer.saveBitmaptoNVRAM();
    setTimeout(function () {
      printer.disconnect();
      printer.ws.close();
    }, 1800);
  };
}
function print_delete_logo_from_nvram() {
  const printer = new Printer();
  printer.ws.onmessage = function (msg) {
    var json = JSON.parse(msg.data);
    var dev = json.dev;
    var cmd = json.cmd;
    var ack = json.ack;
    console.log(dev + " " + cmd + " " + ack);
    if (dev == "printer") {
      if (cmd == "deleteBitmapFromNVRAM") {
        if (ack == "true") {
          alert("deleteBitmapFromNVRAM success");
        } else {
          alert("deleteBitmapFromNVRAM fail");
        }
      }
    }
  };
  printer.ws.onclose = function () {
    console.log("printer onclose");
  };
  printer.ws.onerror = function (evt) {
    console.log("printer onerror");
  };
  printer.ws.onopen = function () {
    console.log("printer onopen");
    printer.connectBuiltinPrinter(58);
    printer.deleteBitmapFromNVRAM();
    setTimeout(function () {
      printer.disconnect();
      printer.ws.close();
    }, 1800);
  };
}
