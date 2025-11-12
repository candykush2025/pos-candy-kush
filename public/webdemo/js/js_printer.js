let timeout;

// 显示通知
function showNotification(title, message, duration = 5000) {
    clearTimeout(timeout);
    const existingNotification = document.querySelector('.notification-modal');
    if (existingNotification) {
        existingNotification.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'notification-content';

    const titleElement = document.createElement('div');
    titleElement.className = 'modal-title';
    titleElement.textContent = title;

    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = () => modal.remove();

    const messageElement = document.createElement('div');
    messageElement.className = 'modal-message';
    messageElement.textContent = message;

    modalContent.appendChild(titleElement);
    modalContent.appendChild(closeButton);
    modalContent.appendChild(messageElement);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    // 在指定时间后自动关闭
    timeout = setTimeout(() => {
        modal.remove();
    }, duration);
}

// 生成示例餐厅账单
function generateSampleBill() {
    return `
        RESTAURANT BILL
        ===============
        Date: ${new Date().toLocaleString()}
        
        Items:
        1. Burger      $10.99
        2. Fries       $3.99
        3. Soda        $1.99
        
        Subtotal:      $16.97
        Tax (8%):      $1.36
        ---------------
        Total:         $18.33
        
        Thank you for dining with us!
    `;
}

// 测试 USB 打印机
async function testUsbPrinter() {
    if (!navigator.usb) {
        showNotification('USB Printer Error', 'WebUSB is not supported in this browser. Please use a browser that supports WebUSB, such as Google Chrome.');
        return;
    }

    let device;
    try {
        device = await navigator.usb.requestDevice({
            filters: [{ classCode: 0x07 }] // USB 打印机类代码
        });

        await device.open();
        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }
        await device.claimInterface(0);

        const data = generateSampleBill();
        const encoder = new TextEncoder();
        const dataArrayBuffer = encoder.encode(data);

        await device.transferOut(1, dataArrayBuffer);
        showNotification('USB Printer', 'Test print sent successfully!');
    } catch (error) {
        console.error('USB Printer Error:', error);
        if (error.name === 'NotFoundError') {
            showNotification('USB Printer Error', 'No compatible USB printer found. Please make sure your printer is connected and try again.');
        } else if (error.name === 'SecurityError') {
            showNotification('USB Printer Error', 'Access to the USB device was denied. Please make sure you have the necessary permissions and try again.');
        } else {
            showNotification('USB Printer Error', `Failed to connect to the USB printer: ${error.message}. Please check your connection and try again.`);
        }
    } finally {
        if (device && device.opened) {
            try {
                await device.close();
            } catch (closeError) {
                console.error('关闭 USB 设备时出错:', closeError);
            }
        }
    }
}

// 测试蓝牙打印机
async function testBluetoothPrinter() {
    try {
        // 蓝牙设备服务 UUID 设置为 SPP 协议 UUID
        const serviceUUIDs = [
            '00001101-0000-1000-8000-00805f9b34fb', // 串行端口配置文件 (SPP)
            // '00001800-0000-1000-8000-00805f9b34fb', // 通用访问
            // '00001801-0000-1000-8000-00805f9b34fb', // 通用属性
            // '0000180d-0000-1000-8000-00805f9b34fb', // 心率
            // '0000180f-0000-1000-8000-00805f9b34fb', // 电池
            // '0000180a-0000-1000-8000-00805f9b34fb', // 设备信息
            // '00001812-0000-1000-8000-00805f9b34fb', // 人机接口设备
            // '00001809-0000-1000-8000-00805f9b34fb', // 健康温度计
            // '0000181a-0000-1000-8000-00805f9b34fb', // 环境感知
            // '00001802-0000-1000-8000-00805f9b34fb', // 即时警报
            // '00001811-0000-1000-8000-00805f9b34fb', // 警报通知
            // '00001803-0000-1000-8000-00805f9b34fb', // 链路丢失
            // '0009180d-0000-1000-8000-00705f9b34fb', 
        ];

        const isBluetoothSupported = 'bluetooth' in navigator;
        if (!isBluetoothSupported) {
            console.error('此浏览器不支持蓝牙。');
            showNotification('Bluetooth Printer Error', 'Bluetooth is not supported in this browser. Please use a browser that supports Bluetooth.');
            return;
        }

        // 请求连接蓝牙设备
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,  // 不设置设备过滤器，接受所有蓝牙设备
            optionalServices: serviceUUIDs  // 使用 SPP 协议 UUID
        });

        console.log(`找到设备: ${device.name}`);

        // 连接到设备
        const server = await device.gatt.connect();
        console.log('已连接到设备:', device.name);

        // 获取蓝牙设备的服务
        const services = await server.getPrimaryServices();
        console.log('可用服务:', services);

        // 查找蓝牙串口协议服务（SPP）
        const sppService = services.find(service => service.uuid === '00001101-0000-1000-8000-00805f9b34fb');
        if (sppService) {
            console.log('找到 SPP 服务！');

            // 获取设备的特征（假设是写特征，UUID 可能会有所不同）
            const characteristics = await sppService.getCharacteristics();
            console.log('可用特征:', characteristics);

            // 假设 'write' 特征是用于发送数据的特征
            const characteristic = characteristics.find(c => c.properties.write);
            if (characteristic) {
                // 生成测试打印数据（例如：文本数据）
                const data = generateSampleBill();  // 示例打印数据

                // 将数据发送到打印机
                await characteristic.writeValue(new TextEncoder().encode(data));
                console.log('打印数据发送成功！');
                
                // 显示通知
                showNotification('Bluetooth Printer', 'Test print sent successfully!');
            } else {
                console.log('未找到可写特征。');
                showNotification('Bluetooth Printer', 'No writable characteristic found.');
            }
        } else {
            console.log('未找到 SPP 服务。');
            showNotification('Bluetooth Printer', 'No SPP service found.');
        }

    } catch (error) {
        console.error('蓝牙打印机错误:', error);
        showNotification('Bluetooth Printer Error', 'Failed to connect to the Bluetooth printer. Please check your connection and try again.');
    }
}
