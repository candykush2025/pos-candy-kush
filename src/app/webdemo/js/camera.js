let currentStream;
let notificationTimeout;

// 创建通知模态框
function showNotification(title, message, duration = 5000) {
    // 清除任何现有的通知
    clearTimeout(notificationTimeout);
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
    notificationTimeout = setTimeout(() => {
        modal.remove();
    }, duration);
}

async function testCamera() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');

        if (videoDevices.length === 0) {
            showNotification('Camera Error', 'No camera devices detected. Please check your camera connection and permissions.');
            return;
        }

        if (videoDevices.length === 1) {
            await requestCameraPermission(videoDevices[0].deviceId);
        } else {
            showDeviceList(videoDevices);
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        showNotification('Camera Error', 'An error occurred while accessing the camera. Please check your camera permissions and try again.');
    }
}

function showDeviceList(devices) {
    const modal = createCameraModal('Select Camera Device');
    const list = document.createElement('ul');
    list.className = 'device-list';
    
    devices.forEach(device => {
        const item = document.createElement('li');
        item.textContent = device.label || `Camera ${device.deviceId.substr(0, 5)}...`;
        item.onclick = () => {
            modal.remove();
            requestCameraPermission(device.deviceId);
        };
        list.appendChild(item);
    });

    modal.querySelector('.modal-body').appendChild(list);
    document.body.appendChild(modal);
}

function createCameraModal(title) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    // 头部
    const header = document.createElement('div');
    header.className = 'modal-header';
    
    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    
    const closeButton = document.createElement('button');
    closeButton.className = 'modal-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = closeCamera;

    header.appendChild(titleElement);
    header.appendChild(closeButton);

    // 主体
    const body = document.createElement('div');
    body.className = 'modal-body';

    modalContent.appendChild(header);
    modalContent.appendChild(body);
    modal.appendChild(modalContent);

    return modal;
}

async function requestCameraPermission(deviceId) {
    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: deviceId ? { exact: deviceId } : undefined }
        });
        showCameraModal(deviceId);
    } catch (error) {
        console.error('Error opening camera:', error);
        showNotification('Camera Error', 'Failed to open camera. Please try again.');
    }
}

function showCameraModal(deviceId) {
    const modal = createCameraModal('Test Camera Connection');
    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.srcObject = currentStream;

    modal.querySelector('.modal-body').appendChild(video);
    document.body.appendChild(modal);
}

function closeCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    const modal = document.querySelector('.modal');
    if (modal) {
        modal.remove();
    }
}