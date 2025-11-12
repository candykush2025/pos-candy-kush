let isReading = false;

async function testNFC() {
    // 检查是否支持NFC
    if (!('NDEFReader' in window)) {
        showNFCNotification('NFC Error', 'NFC is not supported on this device or browser. Please use Chrome for Android.');
        return;
    }

    try {
        // 请求NFC权限并开始扫描
        const ndef = new NDEFReader();
        await ndef.scan();
        
        // 显示扫描模态框
        showNFCScanningModal();
        isReading = true;

        // 监听NFC读取
        ndef.addEventListener("reading", ({ message, serialNumber }) => {
            handleNFCReading(message, serialNumber);
        });

        // 监听错误
        ndef.addEventListener("error", (error) => {
            console.error('NFC Error:', error);
            showNFCNotification('NFC Error', 'An error occurred while reading NFC. Please try again.');
        });

    } catch (error) {
        console.error('NFC Error:', error);
        if (error.name === 'NotAllowedError') {
            showNFCNotification('NFC Error', 'NFC access was denied. Please allow NFC access and try again.');
        } else if (error.name === 'NotReadableError') {
            showNFCNotification('NFC Error', 'NFC device is not readable or may be disabled. Please check your device settings.');
        } else {
            showNFCNotification('NFC Error', 'Failed to initialize NFC. Please check if NFC is enabled on your device.');
        }
    }
}

function showNFCScanningModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Scanning for NFC</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="scanning-animation"></div>
                <p>Please bring an NFC tag close to your device</p>
                <div id="nfc-results" class="nfc-results"></div>
            </div>
        </div>
    `;

    // 处理关闭按钮
    modal.querySelector('.modal-close').addEventListener('click', () => {
        isReading = false;
        modal.remove();
    });

    document.body.appendChild(modal);
}

function handleNFCReading(message, serialNumber) {
    const resultsDiv = document.getElementById('nfc-results');
    if (!resultsDiv) return;

    // 创建结果条目
    const resultEntry = document.createElement('div');
    resultEntry.className = 'nfc-result-entry';

    // 格式化NFC数据
    let formattedData = `<h4>NFC Tag Detected</h4>`;
    formattedData += `<p><strong>Serial Number:</strong> ${serialNumber}</p>`;
    
    // 处理NDEF消息记录
    if (message && message.records) {
        formattedData += '<p><strong>Records:</strong></p>';
        message.records.forEach((record, index) => {
            formattedData += `
                <div class="record">
                    <p>Record ${index + 1}:</p>
                    <ul>
                        <li>Type: ${record.recordType}</li>
                        <li>Media Type: ${record.mediaType || 'N/A'}</li>
                        <li>Data: ${formatNFCData(record)}</li>
                    </ul>
                </div>
            `;
        });
    }

    resultEntry.innerHTML = formattedData;
    resultsDiv.appendChild(resultEntry);
}

function formatNFCData(record) {
    try {
        if (record.recordType === "text") {
            const textDecoder = new TextDecoder();
            return textDecoder.decode(record.data);
        } else if (record.recordType === "url") {
            const textDecoder = new TextDecoder();
            return textDecoder.decode(record.data);
        } else {
            // 对于其他类型，显示十六进制表示
            return Array.from(new Uint8Array(record.data))
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
        }
    } catch (error) {
        console.error('Error formatting NFC data:', error);
        return 'Error reading data';
    }
}

function showNFCNotification(title, message) {
    const modal = document.createElement('div');
    modal.className = 'notification-modal';
    modal.innerHTML = `
        <div class="notification-content">
            <div class="modal-title">${title}</div>
            <button class="modal-close">×</button>
            <div class="modal-message">${message}</div>
        </div>
    `;

    // 处理关闭按钮
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());

    // 3秒后自动关闭
    setTimeout(() => modal.remove(), 3000);

    document.body.appendChild(modal);
}