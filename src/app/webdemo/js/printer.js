class Printer {
	constructor() {
		this.ws = new WebSocket("ws://127.0.0.1:9999");
		this.type = "serial";
		this.slow = "false";
	}
	connectBuiltinPrinter(paperWidth) {
		var cmd = {dev:"printer",cmd:"connectBuiltinPrinter",args:[paperWidth]};
		this.ws.send(JSON.stringify(cmd));
	}
	connectSerialPrinter(port, baudrate, paperWidth) {
		var cmd = {dev:"printer",cmd:"connectSerialPrinter",args:[port,baudrate,paperWidth]};
		this.ws.send(JSON.stringify(cmd));
	}
	connectUsbPrinter(vid, pid, paperWidth) {
		var cmd = {dev:"printer",cmd:"connectUsbPrinter",args:[vid,pid,paperWidth]};
		this.ws.send(JSON.stringify(cmd));
	}
	disconnect() {
		var cmd = {dev:"printer",cmd:"disconnect",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	checkPaper() {
		var cmd = {dev:"printer",cmd:"checkPaper",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	//usually, usb printer is 80mm and serial printer is 58mm
	getPrinterType() {
		var cmd = {dev:"printer",cmd:"getPrinterType",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdJumpTab() {
		var cmd = {dev:"printer",cmd:"cmdJumpTab",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdUnSetTable() {
		var cmd = {dev:"printer",cmd:"cmdUnSetTable",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetTable(offsets) {
		var cmd = {dev:"printer",cmd:"cmdSetTable",args:[offsets]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdLineFeed() {
		var cmd = {dev:"printer",cmd:"cmdLineFeed",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdLineFeed(n) {
		var cmd = {dev:"printer",cmd:"cmdLineFeed",args:[n]};
		this.ws.send(JSON.stringify(cmd));
	}
	setStringEncoding(encoding) {
		var cmd = {dev:"printer",cmd:"setStringEncoding",args:[encoding]};
		this.ws.send(JSON.stringify(cmd));
	}
	sendData(data) {
		var cmd = {dev:"printer",cmd:"sendData",args:[data]};
		this.ws.send(JSON.stringify(cmd));
	}
	sendDataEx(data,encoding) {
		var cmd = {dev:"printer",cmd:"sendData",args:[data,encoding]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetDefaultLineSpacing() {
		var cmd = {dev:"printer",cmd:"cmdSetDefaultLineSpacing",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetLineSpacing(n) {
		var cmd = {dev:"printer",cmd:"cmdSetLineSpacing",args:[n]};
		this.ws.send(JSON.stringify(cmd));
	}
	//0:left 1:middle 2:right
	cmdSetAlignMode(mode) {
		var cmd = {dev:"printer",cmd:"cmdSetAlignMode",args:[mode]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetPrintOffset(offset) {
		var cmd = {dev:"printer",cmd:"cmdSetPrintOffset",args:[offset]};
		this.ws.send(JSON.stringify(cmd));
	}
	//  bit0: 0 restore default                                                                                         
	//  bit1: inverse                                                                                                   
	//  bit2: upside down                                                                                               
	//  bit3: emphasized                                                                                                
	//  bit4: double height                                                                                             
	//  bit5: double width                                                                                              
	//  bit6: rotated 90° clockwise                                                                                     
	//  bit7: underline 
	cmdSetPrintMode(mode) {
		var cmd = {dev:"printer",cmd:"cmdSetPrintMode",args:[mode]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetUnderlineHeight(h) {
		var cmd = {dev:"printer",cmd:"cmdSetUnderlineHeight",args:[h]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetFontScaleSize(wScale,hScale) {
		var cmd = {dev:"printer",cmd:"cmdSetFontScaleSize",args:[wScale,hScale]};
		this.ws.send(JSON.stringify(cmd));
	}
	// 0: not printed
	// 1: above bar code
	// 2: below bar code
	// 3: botha below and above bar code
	cmdSetBarCodeStringPosition(position) {
		var cmd = {dev:"printer",cmd:"cmdSetBarCodeStringPosition",args:[position]};
		this.ws.send(JSON.stringify(cmd));
	}
	//0 (12x24), 1 (9x17)
	cmdSetBarCodeStringSize(size) {
		var cmd = {dev:"printer",cmd:"cmdSetBarCodeStringSize",args:[size]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetBarCodeHeight(h) {
		var cmd = {dev:"printer",cmd:"cmdSetBarCodeHeight",args:[h]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetBarCodeWidth(w) {
		var cmd = {dev:"printer",cmd:"cmdSetBarCodeWidth",args:[w]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetBarCodeLeftSpacing(n) {
		var cmd = {dev:"printer",cmd:"cmdSetBarCodeLeftSpacing",args:[n]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdBarCodePrint(code, text) {
		var cmd = {dev:"printer",cmd:"cmdBarCodePrint",args:[code,text]};
		this.ws.send(JSON.stringify(cmd));
	}
	//real path in Android is likely "/storage/emulated/0/Download/logo.bmp"
	//eg: path = "Download/logo.bmp"
	cmdBitmapPrint(path, leftOffset, topOffset) {
		var cmd = {dev:"printer",cmd:"cmdBitmapPrint",args:[path,leftOffset,topOffset]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdBitmapPrintEx(path, leftOffset, topOffset) {
		var cmd = {dev:"printer",cmd:"cmdBitmapPrintEx",args:[path,leftOffset,topOffset]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetHeatingParam(dots, time, interval) {
		var cmd = {dev:"printer",cmd:"cmdSetHeatingParam",args:[dots,time,interval]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetPrintDensity(density, delay) {
		var cmd = {dev:"printer",cmd:"cmdSetPrintDensity",args:[density,delay]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdSetPrinterLanguage(code) {
		var cmd = {dev:"printer",cmd:"cmdSetPrinterLanguage",args:[code]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdQrCodePrint(version, ecc, text) {
		var cmd = {dev:"printer",cmd:"cmdQrCodePrint",args:[version,ecc,text]};
		this.ws.send(JSON.stringify(cmd));
	}
	//0: full cut 1: half cut
	cmdCutPaper(mode) {
		var cmd = {dev:"printer",cmd:"cmdCutPaper",args:[mode]};
		this.ws.send(JSON.stringify(cmd));
	}
	cmdPrintBitmapFromNVRAM(index, zoom) {
		var cmd = {dev:"printer",cmd:"cmdPrintBitmapFromNVRAM",args:[index,zoom]};
		this.ws.send(JSON.stringify(cmd));
	}
	saveBitmaptoNVRAM() {
		//real path in Android is /storage/emulated/0/Download/logo.bmp
		//usually browser download logos to /storage/emulated/0/Download/xxx.bmp
		var bmp1 = "Download/logo.bmp";
		var bmp2 = "Download/logo_large.bmp";
		var cmd = {dev:"printer",cmd:"saveBitmaptoNVRAM",args:[bmp1,bmp2]};
		this.ws.send(JSON.stringify(cmd));
	}
	deleteBitmapFromNVRAM() {
		var cmd = {dev:"printer",cmd:"deleteBitmapFromNVRAM",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	printDevidingLine() {
		var cmd = {dev:"printer",cmd:"printDevidingLine",args:[]};
		this.ws.send(JSON.stringify(cmd));
	}
	printLine(text) {
		var cmd = {dev:"printer",cmd:"printLine",args:[text]};
		this.ws.send(JSON.stringify(cmd));
	}
	printLineCombo(textLeft, textRight) {
		var cmd = {dev:"printer",cmd:"printLineCombo",args:[textLeft,textRight]};
		this.ws.send(JSON.stringify(cmd));
	}
	printLineMulti(arrStr, arrWidth, arrAlign) {
		var cmd = {dev:"printer",cmd:"printLineMulti",args:[JSON.stringify(arrStr),JSON.stringify(arrWidth),JSON.stringify(arrAlign)]};
		this.ws.send(JSON.stringify(cmd));
	}
	printLineByBitmap(text) {
		var cmd = {dev:"printer",cmd:"printLineByBitmap",args:[text]};
		this.ws.send(JSON.stringify(cmd));
	}
	printLineComboByBitmap(textLeft, textRight) {
		var cmd = {dev:"printer",cmd:"printLineComboByBitmap",args:[textLeft,textRight]};
		this.ws.send(JSON.stringify(cmd));
	}
	printLineMultiByBitmap(arrStr, arrWidth, arrAlign) {
		var cmd = {dev:"printer",cmd:"printLineMultiByBitmap",args:[JSON.stringify(arrStr),JSON.stringify(arrWidth),JSON.stringify(arrAlign)]};
		this.ws.send(JSON.stringify(cmd));
	}
}
