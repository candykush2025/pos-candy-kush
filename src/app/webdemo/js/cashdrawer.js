function cashdrawer_open() {
  ws = new WebSocket("ws://127.0.0.1:9999");
  ws.onopen = function () {
    //open cashdrawer with built-in RJ11. FH070H-A,FH100H-A no RJ11 port
    var cmd = { dev: "cashdrawer", cmd: "open" };
    ws.send(JSON.stringify(cmd));
    //open cashdrawer via USB-RJ11 converter
    cmd = { dev: "cashdrawer", cmd: "openEx" };
    ws.send(JSON.stringify(cmd));
    setTimeout(function () {
      ws.close();
    }, 500);
  };
  ws.onmessage = function (msg) {
    var data = msg.data;
    // Handle message data silently
  };
  ws.onclose = function () {
    // Connection closed
  };
  ws.onerror = function (evt) {
    // Connection error occurred
  };
}
