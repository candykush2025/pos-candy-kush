let currentDevice = null;

async function testHIDDevices() {
  if (!navigator.hid) {
    showNotification('HID Error', 'WebHID is not supported in this browser. Please use a browser that supports WebHID, such as Google Chrome.');
    return;
  }

  try {
    const devices = await navigator.hid.requestDevice({ filters: [
      // { productId: xx, vendorId: xx }
    ] });
    if (devices.length === 0) {
      showNotification('HID Error', 'No HID devices selected. Please try again and select a device.');
      return;
    }
    showDeviceList(devices);
  } catch (error) {
    console.error('HID Error:', error);
    showNotification('HID Error', 'Failed to access HID devices. Please check your permissions and try again.');
  }
}

function showDeviceList(devices) {
  const modal = createModal('Available HID Devices');
  const list = document.createElement('ul');
  list.className = 'device-list';

  // 使用 Set 来存储已经添加的设备 ID
  const addedDevices = new Set();

  devices.forEach(device => {
      const deviceId = `${device.vendorId}:${device.productId}`;
      
      // 检查这个设备是否已经被添加
      if (!addedDevices.has(deviceId)) {
          const item = document.createElement('li');
          item.textContent = `${device.productName} (${deviceId})`;
          item.onclick = () => {
            connectToDevice(device);
            modal.remove();
          };
          list.appendChild(item);

          // 将这个设备标记为已添加
          addedDevices.add(deviceId);
      }
  });

  modal.querySelector('.modal-body').appendChild(list);
  document.body.appendChild(modal);
}

async function connectToDevice(device) {
  try {
      if (device.opened) {
        console.log('Device is already opened:', device.productName);
        showNotification('HID Device', `${device.productName} is already connected`);
      } else {
        await device.open();
        console.log('Connected to', device.productName);
        showNotification('HID Device', `Connected to ${device.productName}`);
      }
      currentDevice = device;
      device.addEventListener('inputreport', handleInputReport);
  } catch (error) {
      console.error('Connection error:', error);
      let errorMessage = `Failed to connect to ${device.productName}. `;
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Permission denied. Please make sure you have the necessary permissions.';
      } else if (error.name === 'SecurityError') {
        errorMessage += 'Security error. This might be due to the page not being served over HTTPS.';
      } else {
        errorMessage += `Error: ${error.message}`;
      }
      showNotification('HID Error', errorMessage);
  }
}

function handleInputReport(event) {
  const { data, device, reportId } = event;

  // 将 DataView 转换为更易于处理的数组
  const dataArray = new Uint8Array(data.buffer);

  // 检查是否是扫码数据
  if (isBarcodeScannerData(dataArray)) {
    const scannedData = decodeBarcodeScannerData(dataArray);
    showScannedData(scannedData);
  } else {
    console.log('Received data from', device.productName, ':', dataArray);
  }
}

function isBarcodeScannerData(dataArray) {
  // 检查是否至少有3个字节（起始、至少一个数据、结束）
  if (dataArray.length < 3) return false;

  // 检查起始字节和结束字节
  if (dataArray[0] !== 0x02 || dataArray[dataArray.length - 2] !== 0x03) return false;

  // 验证校验和
  const calculatedChecksum = dataArray.slice(1, -2).reduce((a, b) => a ^ b, 0);
  return calculatedChecksum === dataArray[dataArray.length - 1];
}

function decodeBarcodeScannerData(dataArray) {
  // 提取数据字节（去掉起始、结束和校验字节）
  const dataBytes = dataArray.slice(1, -2);

  // 将字节转换为字符串
  return String.fromCharCode.apply(null, dataBytes);
}

function showScannedData(data) {
  const modal = createModal('Scanned Data');
  const content = document.createElement('p');
  content.textContent = data;
  modal.querySelector('.modal-body').appendChild(content);
  document.body.appendChild(modal);
}

function createModal(title) {
  const modal = document.createElement('div');
  modal.className = 'modal';

  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';

  const header = document.createElement('div');
  header.className = 'modal-header';

  const titleElement = document.createElement('h2');
  titleElement.textContent = title;

  const closeButton = document.createElement('button');
  closeButton.className = 'modal-close';
  closeButton.innerHTML = '×';
  closeButton.onclick = () => modal.remove();

  header.appendChild(titleElement);
  header.appendChild(closeButton);

  const body = document.createElement('div');
  body.className = 'modal-body';

  modalContent.appendChild(header);
  modalContent.appendChild(body);
  modal.appendChild(modalContent);

  return modal;
}

function showNotification(title, message, duration = 5000) {
  const modal = document.createElement('div');
  modal.className = 'notification-modal';
  modal.innerHTML = `
      <div class="notification-content">
        <button class="modal-close">&times;</button>
        <div class="modal-title">${title}</div>
        <div class="modal-message">${message}</div>
      </div>
    `;

  modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());

  document.body.appendChild(modal);

  setTimeout(() => modal.remove(), duration);
}

function encodeBarcodeScannerData(data) {
  const dataBytes = new Uint8Array(data.length + 3);
  dataBytes[0] = 0x02; // STX

  for (let i = 0; i < data.length; i++) {
    dataBytes[i + 1] = data.charCodeAt(i);
  }

  dataBytes[dataBytes.length - 2] = 0x03; // ETX

  // 计算校验和
  const checksum = dataBytes.slice(1, -2).reduce((a, b) => a ^ b, 0);
  dataBytes[dataBytes.length - 1] = checksum;

  return dataBytes;
}