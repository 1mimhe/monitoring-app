const socket = io({
  ackTimeout: 10000,
  retries: 3
});

const systems = new Map();
const { pcName, room, role } = Qs.parse(location.search, { ignoreQueryPrefix: true });
let selectedChat = null; // For admin to track selected chat

// Header updates
document.getElementById('room-name').textContent = `Room: ${room}`;
document.getElementById('pc-name').textContent = `PC: ${pcName}`;

function updateTime() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

// Selectors
const $input = document.getElementById('input');
const $messages = document.getElementById('messages');
const $sendButton = document.getElementById('send');
const $broadcastButton = document.getElementById('broadcast');
const $popup = document.getElementById('popup');
const $sidebar = document.getElementById('sidebar');
const $systemList = document.getElementById('system-list');
const $closeChatButton = document.getElementById('close-chat');

function scrollToBottom() {
  $messages.scrollTop = $messages.scrollHeight;
}

function addMessage(msg, type = 'normal', sender = 'You') {
  const item = document.createElement('li');
  item.classList.add(`message-${type}`);

  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const messageText = document.createElement('div');
  messageText.textContent = msg;
  messageText.style.marginBottom = '0.25rem';

  const metaInfo = document.createElement('div');
  metaInfo.textContent = `${sender} • ${time}`;
  metaInfo.style.textAlign = 'right';
  metaInfo.style.fontSize = '0.75rem';
  metaInfo.style.color = '#888';

  item.appendChild(messageText);
  item.appendChild(metaInfo);

  $messages.appendChild(item);
  scrollToBottom();
}

function updateChatStatus() {
  if (role === 'admin') {
    const statusDiv = document.getElementById('chat-status') || createChatStatusDiv();
    if (selectedChat) {
      statusDiv.textContent = `Chatting with: ${selectedChat}`;
      statusDiv.style.color = '#4caf50';
      $sendButton.textContent = `Send to ${selectedChat}`;
      $sendButton.removeAttribute('disabled');
      $closeChatButton.style.display = 'inline-block';
      addSelectionFeedback(selectedChat, 'select');
    } else {
      statusDiv.textContent = 'No chat selected - Broadcast mode';
      statusDiv.style.color = '#ff9800';
      $sendButton.textContent = 'Send';
      $sendButton.setAttribute('disabled', 'disabled');
      $closeChatButton.style.display = 'none';
      addSelectionFeedback(null, 'close');
    }
  }
}

function createChatStatusDiv() {
  const statusDiv = document.createElement('div');
  statusDiv.id = 'chat-status';
  statusDiv.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    padding: 8px 12px;
    background: rgba(0,0,0,0.8);
    color: white;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1001;
  `;
  document.body.appendChild(statusDiv);
  return statusDiv;
}

document.getElementById('form').addEventListener('submit', (e) => {
  e.preventDefault();
  if ($input.value.trim()) {
    if (role === 'admin' && !selectedChat) {
      showPopup('Please select a user to chat with or use broadcast', 'error');
      return;
    }
    sendMessage();
  }
});

$sendButton.addEventListener('click', (e) => {
  e.preventDefault();
  if ($input.value.trim()) {
    if (role === 'admin' && !selectedChat) {
      showPopup('Please select a user to chat with or use broadcast', 'error');
      return;
    }
    sendMessage();
  }
});

$broadcastButton.addEventListener('click', (e) => {
  e.preventDefault();
  if ($input.value.trim()) {
    sendBroadcast();
  }
});

if ($closeChatButton) {
  $closeChatButton.addEventListener('click', (e) => {
    e.preventDefault();
    closeChat();
  });
}

function sendMessage() {
  if ($sendButton.hasAttribute('disabled')) return;

  $sendButton.setAttribute('disabled', 'disabled');
  const message = $input.value.trim();

  if (message) {
    socket.emit('message', message, () => {
      $sendButton.removeAttribute('disabled');
      $input.value = '';
      $input.focus();
    });
  } else {
    $sendButton.removeAttribute('disabled');
  }
}

function sendBroadcast() {
  if ($broadcastButton.hasAttribute('disabled')) return;

  $broadcastButton.setAttribute('disabled', 'disabled');
  const message = $input.value.trim();

  if (message) {
    socket.emit('broadcast', message, () => {
      setTimeout(() => {
        $broadcastButton.removeAttribute('disabled');
      }, 10000);
      $input.value = '';
      $input.focus();
    });
  } else {
    $broadcastButton.removeAttribute('disabled');
  }
}

// Socket connection
socket.emit('join', { pcName, room, role }, (response) => {
  if (response?.error) {
    alert(response.error);
    location.href = '/';
  }
});

// Socket Event Listeners
socket.on('join', ({ pcName: joinedPcName, room: joinedRoom }) => {
  systems.set(joinedPcName, { online: true });
  renderSystems();
});

socket.on('userList', (users) => {
  users.forEach(user => {
    systems.set(user, { online: true });
  });
  renderSystems();
});

socket.on('message', (msg, type = 'normal', sender = 'You') => {
  addMessage(msg, type, sender);
});

socket.on('error', (msg) => {
  showPopup(msg, 'error');
});

socket.on('info', (info, pcName) => {
  const existingData = systems.get(pcName) || {};
  systems.set(pcName, { ...existingData, info, online: true });
  renderSystems();
});

socket.on('dis', (pcName) => {
  console.log('System disconnected:', pcName);
  if (systems.has(pcName)) {
    const data = systems.get(pcName);
    systems.set(pcName, { ...data, online: false });
    renderSystems();

    if (role === 'admin' && selectedChat === pcName) {
      selectedChat = null;
      updateChatStatus();
    }
  }
});

function showPopup(message, type = 'error') {
  $popup.textContent = message;
  $popup.className = 'show';

  if (type === 'error') {
    $popup.style.background = '#f44336';
  } else if (type === 'success') {
    $popup.style.background = '#4caf50';
  } else if (type === 'info') {
    $popup.style.background = '#2196f3';
  }

  setTimeout(() => {
    $popup.classList.remove('show');
  }, 3000);
}

function createSystemInfoPopup() {
  const overlay = document.createElement('div');
  overlay.id = 'system-info-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 2000;
    display: none;
  `;

  const popup = document.createElement('div');
  popup.id = 'system-info-popup';
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #2c3e50;
    color: white;
    border-radius: 8px;
    padding: 20px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 2001;
  `;

  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #34495e;
    padding-bottom: 10px;
    margin-bottom: 20px;
  `;

  const title = document.createElement('h2');
  title.style.cssText = 'margin: 0; color: #00bcd4;';
  title.textContent = 'System Information';

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: #e74c3c;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;

  const content = document.createElement('div');
  content.id = 'system-info-content';

  header.appendChild(title);
  header.appendChild(closeButton);
  popup.appendChild(header);
  popup.appendChild(content);
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  closeButton.addEventListener('click', () => {
    overlay.style.display = 'none';
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  });

  return overlay;
}

function showSystemInfo(pcName) {
  let overlay = document.getElementById('system-info-overlay');
  if (!overlay) {
    overlay = createSystemInfoPopup();
  }

  const content = document.getElementById('system-info-content');
  const title = overlay.querySelector('h2');
  title.textContent = `System Information - ${pcName}`;

  content.innerHTML = '';

  const { info } = systems.get(pcName);
  if (!info) {
    content.innerHTML = '<p style="color: #e74c3c;">No system information available</p>';
    overlay.style.display = 'block';
    return;
  }

  const sections = [
    {
      title: 'Operating System',
      data: info.os,
      formatter: (os) => ({
        'Hostname': os.hostname,
        'Platform': os.platform,
        'Architecture': os.architecture,
        'Release': os.release,
        'Type': os.type,
        'Uptime': os.uptime
      })
    },
    {
      title: 'CPU Information',
      data: info.cpu,
      formatter: (cpu) => ({
        'CPU Usage': `${cpu.usedCpu.toFixed(2)}%`,
        'Free CPU': `${cpu.freeCpu.toFixed(2)}%`,
        'Cores': cpu.cores.length,
        'Model': cpu.cores[0].model
      })
    },
    {
      title: 'Memory Information',
      data: info.memory,
      formatter: (memory) => ({
        'Total Memory': memory.totalMemory,
        'Used Memory': memory.usedMemory,
        'Free Memory': memory.freeMemory,
        'Usage Percentage': `${memory.memoryUsagePercentage.toFixed(2)}%`
      })
    },
    {
      title: 'Network Interfaces',
      data: info.networkInterfaces,
      formatter: (interfaces) => {
        const result = {};
        Object.keys(interfaces).forEach(name => {
          const iface = interfaces[name];
          result[name] = iface.map(i => `${i.family}: ${i.address}`).join('\n');
        });
        return result;
      }
    }
  ];

  sections.forEach(section => {
    if (section.data) {
      const sectionDiv = document.createElement('div');
      sectionDiv.style.cssText = 'margin-bottom: 25px;';

      const sectionTitle = document.createElement('h3');
      sectionTitle.textContent = section.title;
      sectionTitle.style.cssText = `
        color: #00bcd4;
        margin-bottom: 10px;
        border-bottom: 1px solid #34495e;
        padding-bottom: 5px;
      `;

      const sectionContent = document.createElement('div');
      sectionContent.style.cssText = 'margin-left: 10px;';

      const formattedData = section.formatter(section.data);
      Object.keys(formattedData).forEach(key => {
        const item = document.createElement('div');
        item.style.cssText = 'margin-bottom: 8px;';

        const label = document.createElement('strong');
        label.textContent = `${key}: `;
        label.style.color = '#ecf0f1';

        const value = document.createElement('span');
        value.textContent = formattedData[key];
        value.style.color = '#bdc3c7';

        item.appendChild(label);
        item.appendChild(value);
        sectionContent.appendChild(item);
      });

      sectionDiv.appendChild(sectionTitle);
      sectionDiv.appendChild(sectionContent);
      content.appendChild(sectionDiv);
    }
  });

  overlay.style.display = 'block';
}

function renderSystems() {
  $systemList.innerHTML = '';

  if (systems.size === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.textContent = 'No systems connected.';
    emptyItem.style.color = '#666';
    emptyItem.style.fontStyle = 'italic';
    $systemList.appendChild(emptyItem);
    return;
  }

  systems.forEach((data, pc) => {
    const li = document.createElement('li');
    li.classList.add('system-item');
    li.style.cssText = 'display: flex; flex-direction: column; padding: 0.75rem 0.5rem; cursor: pointer; border-bottom: 1px solid #34495e; transition: all 0.3s; position: relative;';

    const selectionLine = document.createElement('div');
    selectionLine.classList.add('selection-line');
    li.appendChild(selectionLine);

    const selectionBorder = document.createElement('div');
    selectionBorder.classList.add('selection-border');
    li.appendChild(selectionBorder);

    const mainRow = document.createElement('div');
    mainRow.style.cssText = 'display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;';

    const leftSection = document.createElement('div');
    leftSection.style.cssText = 'display: flex; align-items: center;';

    const indicator = document.createElement('span');
    indicator.textContent = data.online ? '●' : '○';
    indicator.style.color = data.online ? '#4caf50' : '#f44336';
    indicator.style.marginRight = '0.5rem';

    const pcName = document.createElement('span');
    pcName.textContent = pc;
    pcName.classList.add('system-name');

    if (role === 'admin' && selectedChat === pc) {
      li.classList.add('selected', 'active-chat');
      pcName.style.fontWeight = 'bold';
      pcName.style.color = '#00bcd4';
    }

    leftSection.appendChild(indicator);
    leftSection.appendChild(pcName);
    mainRow.appendChild(leftSection);

    if (role === 'admin' && data.online) {
      const buttonsSection = document.createElement('div');
      buttonsSection.style.cssText = 'display: flex; gap: 0.25rem; margin-top: 0.5rem; position: relative; z-index: 2;';

      const chatButton = document.createElement('button');
      chatButton.textContent = selectedChat === pc ? 'Selected' : 'Chat';
      chatButton.style.cssText = `
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        background: ${selectedChat === pc ? '#4caf50' : '#00bcd4'};
        color: white;
        transition: background 0.3s;
      `;

      if (selectedChat !== pc) {
        chatButton.addEventListener('click', (e) => {
          e.stopPropagation();
          selectChat(pc);
        });
      } else {
        chatButton.disabled = true;
      }

      const infoButton = document.createElement('button');
      infoButton.textContent = 'Info';
      infoButton.style.cssText = `
        padding: 0.25rem 0.5rem;
        font-size: 0.75rem;
        border: none;
        border-radius: 3px;
        cursor: pointer;
        background: #666;
        color: white;
        transition: background 0.3s;
      `;

      infoButton.addEventListener('click', (e) => {
        e.stopPropagation();
        showSystemInfo(pc);
      });

      buttonsSection.appendChild(chatButton);
      buttonsSection.appendChild(infoButton);

      li.appendChild(mainRow);
      li.appendChild(buttonsSection);
    } else {
      li.appendChild(mainRow);
    }

    if (!data.online) {
      li.classList.add('offline');
      li.style.opacity = '0.6';
    }

    li.addEventListener('mouseenter', () => {
      if (data.online && selectedChat !== pc) {
        li.style.backgroundColor = '#34495e';
      }
    });

    li.addEventListener('mouseleave', () => {
      if (selectedChat !== pc) {
        li.style.backgroundColor = 'transparent';
      }
    });

    $systemList.appendChild(li);
  });
}

function selectChat(pcName) {
  if (role !== 'admin') return;

  const allItems = document.querySelectorAll('.system-item');
  allItems.forEach(item => {
    item.classList.remove('selected', 'active-chat');
  });

  socket.emit('selectChat', pcName, () => {
    selectedChat = pcName;
    updateChatStatus();

    renderSystems();
      const selectedItem = Array.from(document.querySelectorAll('.system-item')).find(item => {
      const nameSpan = item.querySelector('.system-name');
      return nameSpan && nameSpan.textContent === pcName;
    });

    if (selectedItem) {
      selectedItem.classList.add('selected', 'active-chat');
    }
  });
}

function closeChat() {
  if (role !== 'admin') return;

  const currentSelectedItem = document.querySelector('.system-item.selected');
  
  socket.emit('closeChat', () => {
    selectedChat = null;
    updateChatStatus();
    
    if (currentSelectedItem) {
      currentSelectedItem.style.transition = 'all 0.3s ease';
      currentSelectedItem.classList.remove('selected', 'active-chat');
      renderSystems();
    } else {
      renderSystems();
    }
  });
}

function addSelectionFeedback(pcName, action = 'select') {
  const statusDiv = document.getElementById('chat-status') || createChatStatusDiv();
  
  if (action === 'select') {
    statusDiv.style.transform = 'scale(1.05)';
    statusDiv.style.background = 'rgba(76, 175, 80, 0.9)';
    
    setTimeout(() => {
      statusDiv.style.transform = 'scale(1)';
      statusDiv.style.background = 'rgba(0,0,0,0.8)';
    }, 200);
  } else if (action === 'close') {
    statusDiv.style.transform = 'scale(0.95)';
    statusDiv.style.background = 'rgba(244, 67, 54, 0.9)';
    
    setTimeout(() => {
      statusDiv.style.transform = 'scale(1)';
      statusDiv.style.background = 'rgba(0,0,0,0.8)';
    }, 200);
  }
}

if (role === 'admin') {
  $sidebar.classList.remove('hidden');
  $sidebar.classList.add('show');
  $closeChatButton.classList.remove('hidden');
  $closeChatButton.classList.add('show');
  updateChatStatus();
} else {
  $sidebar.classList.add('hidden');
  $sidebar.classList.remove('show');
  $sendButton.removeAttribute('disabled');
}

window.addEventListener('load', () => {
  $input.focus();
});

// Handle connection status
socket.on('connect', () => {
  console.log('Connected to server.');
  showPopup('Connected to server.', 'success');
});

socket.on('disconnect', () => {
  console.log('Disconnected from server.');
  showPopup('Disconnected from server.', 'error');
});

socket.on('reconnect', () => {
  console.log('Reconnected to server.');
  showPopup('Reconnected to server.', 'success');
});