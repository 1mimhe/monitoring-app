/**
 * Monitoring App — Realtime Client Dashboard Controller
 * Handles Socket.IO communication, room participation, agent metrics rendering,
 * direct messaging, broadcasts, and system information modals.
 */

// ── Query Params & State Initialization ───────────────────────────────────────
const { pcName, room, role } = Qs.parse(location.search, { ignoreQueryPrefix: true });

if (!pcName || !room || !role) {
  location.href = '/';
}

/** Map storing connected agent state: pcName -> { online: boolean, info?: SystemInfo } */
const systems = new Map();
let selectedChat = null; // Admin-only: pcName of targeted agent for 1:1 chat

// ── DOM Elements ─────────────────────────────────────────────────────────────
const $roomName        = document.getElementById('room-name');
const $pcName          = document.getElementById('pc-name');
const $currentTime     = document.getElementById('current-time');
const $connIndicator   = document.getElementById('connection-indicator');
const $connLabel       = document.getElementById('connection-label');
const $toast           = document.getElementById('toast');

const $statusBar       = document.getElementById('chat-status-bar');
const $statusText      = document.getElementById('chat-status-text');
const $closeChatBtn    = document.getElementById('close-chat-btn');

const $messagesList    = document.getElementById('messages');
const $messageForm     = document.getElementById('message-form');
const $messageInput    = document.getElementById('message-input');
const $sendBtn         = document.getElementById('send-btn');
const $broadcastBtn    = document.getElementById('broadcast-btn');

const $sidebar         = document.getElementById('sidebar');
const $agentCount      = document.getElementById('agent-count');
const $systemList      = document.getElementById('system-list');

const $sysinfoOverlay  = document.getElementById('sysinfo-overlay');
const $sysinfoTitle    = document.getElementById('sysinfo-title');
const $sysinfoBody     = document.getElementById('sysinfo-body');
const $sysinfoClose    = document.getElementById('sysinfo-close');

// ── Header Setup ─────────────────────────────────────────────────────────────
$roomName.textContent = `Room: ${room}`;
$pcName.textContent   = `${role === 'admin' ? '👑 Admin' : '💻 Agent'}: ${pcName}`;

function updateClock() {
  const now = new Date();
  $currentTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ── Socket Initialization ────────────────────────────────────────────────────
const socket = io({
  ackTimeout: 10000,
  retries: 3
});

// ── Toast Notifications ──────────────────────────────────────────────────────
let toastTimer = null;
function showToast(message, type = 'info') {
  if (toastTimer) clearTimeout(toastTimer);
  $toast.textContent = message;
  $toast.className = `show toast-${type}`;
  toastTimer = setTimeout(() => {
    $toast.className = '';
  }, 3500);
}

// ── Connection State Handling ────────────────────────────────────────────────
function setConnectionState(connected, label) {
  if (connected) {
    $connIndicator.classList.add('connected');
    $connIndicator.classList.remove('disconnected');
    $connLabel.textContent = label || 'Connected';
  } else {
    $connIndicator.classList.remove('connected');
    $connIndicator.classList.add('disconnected');
    $connLabel.textContent = label || 'Disconnected';
  }
}

socket.on('connect', () => {
  setConnectionState(true, 'Connected');
  showToast('Connected to monitoring server', 'success');

  // Join designated room
  socket.emit('join', { pcName, room, role }, (response) => {
    if (response?.error) {
      showToast(response.error, 'error');
      setTimeout(() => { location.href = '/'; }, 2000);
    }
  });
});

socket.on('disconnect', () => {
  setConnectionState(false, 'Disconnected');
  showToast('Disconnected from server. Reconnecting…', 'error');
});

socket.io.on('reconnect', () => {
  setConnectionState(true, 'Connected');
  showToast('Reconnected to monitoring server', 'success');
});

// ── Chat Messages ────────────────────────────────────────────────────────────
function scrollToBottom() {
  $messagesList.scrollTop = $messagesList.scrollHeight;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderMessage(msg, type = 'normal', sender = 'System') {
  const li = document.createElement('li');
  const isSelf = sender === 'You' || sender === pcName;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Map backend message types to CSS modifier classes
  let modifier = 'other';
  if (isSelf) modifier = 'self';
  else if (type === 'system') modifier = 'system';
  else if (type === 'broadcast') modifier = 'broadcast';
  else if (type === 'warning') modifier = 'warning';

  li.className = `msg msg--${modifier}`;

  const bubble = document.createElement('div');
  bubble.className = 'msg__bubble';
  bubble.textContent = msg;
  li.appendChild(bubble);

  if (type !== 'system') {
    const meta = document.createElement('div');
    meta.className = 'msg__meta';
    meta.textContent = `${sender} • ${time}`;
    li.appendChild(meta);
  }

  $messagesList.appendChild(li);
  scrollToBottom();
}

// ── Admin Chat Status Bar ────────────────────────────────────────────────────
function updateAdminChatStatus() {
  if (role !== 'admin') return;

  if (selectedChat) {
    $statusBar.classList.remove('no-selection');
    $statusText.textContent = `Direct communication with: ${selectedChat}`;
    $closeChatBtn.removeAttribute('hidden');
    $sendBtn.removeAttribute('disabled');
  } else {
    $statusBar.classList.add('no-selection');
    $statusText.textContent = 'No agent selected — Use Broadcast or select an agent from sidebar';
    $closeChatBtn.setAttribute('hidden', '');
    $sendBtn.setAttribute('disabled', 'disabled');
  }
}

// ── Messaging Actions ────────────────────────────────────────────────────────
function handleSendMessage() {
  const text = $messageInput.value.trim();
  if (!text) return;

  if (role === 'admin' && !selectedChat) {
    showToast('Select an agent from the sidebar or click Broadcast', 'info');
    return;
  }

  $sendBtn.disabled = true;
  socket.emit('message', text, (response) => {
    $sendBtn.disabled = false;
    if (response?.error) {
      showToast(response.error, 'error');
      return;
    }
    $messageInput.value = '';
    $messageInput.focus();
  });
}

function handleSendBroadcast() {
  const text = $messageInput.value.trim();
  if (!text) {
    showToast('Type a message to broadcast to all agents', 'info');
    return;
  }

  $broadcastBtn.disabled = true;
  socket.emit('broadcast', text, (response) => {
    if (response?.error) {
      showToast(response.error, 'error');
      $broadcastBtn.disabled = false;
      return;
    }
    $messageInput.value = '';
    $messageInput.focus();
    // Rate-limit broadcast feedback
    setTimeout(() => {
      $broadcastBtn.disabled = false;
    }, 3000);
  });
}

$messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  handleSendMessage();
});

$broadcastBtn.addEventListener('click', (e) => {
  e.preventDefault();
  handleSendBroadcast();
});

$closeChatBtn.addEventListener('click', () => {
  if (role !== 'admin') return;
  socket.emit('closeChat', () => {
    selectedChat = null;
    updateAdminChatStatus();
    renderSidebar();
  });
});

// ── Socket Incoming Events ───────────────────────────────────────────────────
socket.on('message', (msg, type = 'normal', sender = 'System') => {
  renderMessage(msg, type, sender);
});

socket.on('error', (msg) => {
  showToast(msg, 'error');
});

socket.on('join', ({ pcName: joinedPc }) => {
  if (joinedPc !== pcName) {
    systems.set(joinedPc, { online: true });
    renderSidebar();
  }
});

socket.on('userList', (users) => {
  users.forEach((user) => {
    if (user !== pcName) {
      const existing = systems.get(user) || {};
      systems.set(user, { ...existing, online: true });
    }
  });
  renderSidebar();
});

socket.on('info', (info, senderPc) => {
  const existing = systems.get(senderPc) || {};
  systems.set(senderPc, { ...existing, info, online: true });
  renderSidebar();

  // If modal is currently inspecting this PC, update live data
  if (!$sysinfoOverlay.hasAttribute('hidden') && $sysinfoOverlay.dataset.pcName === senderPc) {
    populateSystemInfo(senderPc, info);
  }
});

socket.on('dis', (disconnectedPc) => {
  if (systems.has(disconnectedPc)) {
    const existing = systems.get(disconnectedPc);
    systems.set(disconnectedPc, { ...existing, online: false });
    if (selectedChat === disconnectedPc) {
      selectedChat = null;
      updateAdminChatStatus();
      showToast(`Agent ${disconnectedPc} disconnected`, 'error');
    }
    renderSidebar();
  }
});

// ── Sidebar & Agent List Rendering ───────────────────────────────────────────
function renderSidebar() {
  if (role !== 'admin') return;

  $systemList.innerHTML = '';
  let onlineCount = 0;

  systems.forEach((data, name) => {
    if (data.online) onlineCount++;

    const item = document.createElement('li');
    item.className = `agent-item ${data.online ? '' : 'offline'} ${selectedChat === name ? 'selected' : ''}`;

    // Agent Header (Status Dot + Name)
    const header = document.createElement('div');
    header.className = 'agent-item__header';

    const dot = document.createElement('span');
    dot.className = `agent-status-dot ${data.online ? 'online' : 'offline'}`;

    const label = document.createElement('span');
    label.className = 'agent-name';
    label.textContent = name;

    header.appendChild(dot);
    header.appendChild(label);
    item.appendChild(header);

    // Mini metric bars if metrics available
    if (data.info && data.online) {
      const metricsDiv = document.createElement('div');
      metricsDiv.className = 'agent-metrics';

      // CPU Row
      const cpuUsage = data.info.cpu?.usedCpu ?? 0;
      const cpuClass = cpuUsage > 80 ? 'danger' : cpuUsage > 50 ? 'warn' : '';
      const cpuRow = document.createElement('div');
      cpuRow.className = 'agent-metric-row';
      cpuRow.innerHTML = `
        <span>CPU</span>
        <div class="mini-bar-track">
          <div class="mini-bar-fill ${cpuClass}" style="width: ${Math.min(100, cpuUsage).toFixed(0)}%"></div>
        </div>
        <span>${cpuUsage.toFixed(0)}%</span>
      `;

      // RAM Row
      const memUsage = data.info.memory?.memoryUsagePercentage ?? 0;
      const memClass = memUsage > 85 ? 'danger' : memUsage > 65 ? 'warn' : '';
      const memRow = document.createElement('div');
      memRow.className = 'agent-metric-row';
      memRow.innerHTML = `
        <span>RAM</span>
        <div class="mini-bar-track">
          <div class="mini-bar-fill ${memClass}" style="width: ${Math.min(100, memUsage).toFixed(0)}%"></div>
        </div>
        <span>${memUsage.toFixed(0)}%</span>
      `;

      metricsDiv.appendChild(cpuRow);
      metricsDiv.appendChild(memRow);
      item.appendChild(metricsDiv);
    }

    // Action buttons (Chat & Info)
    const actions = document.createElement('div');
    actions.className = 'agent-actions';

    const chatBtn = document.createElement('button');
    chatBtn.className = `agent-action-btn chat-btn ${selectedChat === name ? 'active' : ''}`;
    chatBtn.textContent = selectedChat === name ? 'Active' : 'Chat';
    chatBtn.disabled = !data.online;
    chatBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectAgent(name);
    });

    const infoBtn = document.createElement('button');
    infoBtn.className = 'agent-action-btn info-btn';
    infoBtn.textContent = 'Metrics';
    infoBtn.disabled = !data.online || !data.info;
    infoBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSystemModal(name);
    });

    actions.appendChild(chatBtn);
    actions.appendChild(infoBtn);
    item.appendChild(actions);

    $systemList.appendChild(item);
  });

  $agentCount.textContent = `${onlineCount} online`;
}

function selectAgent(name) {
  if (role !== 'admin') return;

  socket.emit('selectChat', name, () => {
    selectedChat = name;
    updateAdminChatStatus();
    renderSidebar();
    showToast(`Direct chat established with ${name}`, 'info');
  });
}

// ── System Info Modal ────────────────────────────────────────────────────────
function openSystemModal(name) {
  const agent = systems.get(name);
  if (!agent || !agent.info) {
    showToast(`No telemetry data available for ${name}`, 'error');
    return;
  }

  $sysinfoTitle.textContent = `Telemetry Diagnostics — ${name}`;
  $sysinfoOverlay.dataset.pcName = name;
  populateSystemInfo(name, agent.info);
  $sysinfoOverlay.removeAttribute('hidden');
}

function closeSystemModal() {
  $sysinfoOverlay.setAttribute('hidden', '');
  delete $sysinfoOverlay.dataset.pcName;
}

$sysinfoClose.addEventListener('click', closeSystemModal);
$sysinfoOverlay.addEventListener('click', (e) => {
  if (e.target === $sysinfoOverlay) closeSystemModal();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !$sysinfoOverlay.hasAttribute('hidden')) {
    closeSystemModal();
  }
});

function populateSystemInfo(name, info) {
  const { os, cpu, memory, networkInterfaces } = info;
  const cpuPct = cpu?.usedCpu ?? 0;
  const memPct = memory?.memoryUsagePercentage ?? 0;
  const cpuClass = cpuPct > 80 ? 'danger' : cpuPct > 50 ? 'warn' : '';
  const memClass = memPct > 85 ? 'danger' : memPct > 65 ? 'warn' : '';

  let html = `
    <!-- Operating System Section -->
    <div class="modal-section">
      <h3 class="modal-section-title">Operating System</h3>
      <div class="modal-kv"><span class="modal-kv-key">Hostname</span><span class="modal-kv-value">${escapeHtml(os?.hostname || 'Unknown')}</span></div>
      <div class="modal-kv"><span class="modal-kv-key">Platform</span><span class="modal-kv-value">${escapeHtml(os?.platform || 'Unknown')} (${escapeHtml(os?.architecture || '')})</span></div>
      <div class="modal-kv"><span class="modal-kv-key">OS Type</span><span class="modal-kv-value">${escapeHtml(os?.type || 'Unknown')} ${escapeHtml(os?.release || '')}</span></div>
      <div class="modal-kv"><span class="modal-kv-key">Uptime</span><span class="modal-kv-value">${escapeHtml(os?.uptime || 'Unknown')}</span></div>
    </div>

    <!-- CPU Performance Section -->
    <div class="modal-section">
      <h3 class="modal-section-title">Processor Performance</h3>
      <div class="modal-gauge-row">
        <span class="modal-gauge-label">CPU Load</span>
        <div class="modal-gauge-track">
          <div class="modal-gauge-fill ${cpuClass}" style="width: ${Math.min(100, cpuPct).toFixed(1)}%"></div>
        </div>
        <span class="modal-gauge-value">${cpuPct.toFixed(1)}%</span>
      </div>
      <div class="modal-kv"><span class="modal-kv-key">Model</span><span class="modal-kv-value">${escapeHtml(cpu?.cores?.[0]?.model || 'Standard CPU')}</span></div>
      <div class="modal-kv"><span class="modal-kv-key">Logical Cores</span><span class="modal-kv-value">${cpu?.cores?.length || 1}</span></div>
      <div class="modal-kv"><span class="modal-kv-key">Idle Capacity</span><span class="modal-kv-value">${(cpu?.freeCpu ?? 0).toFixed(1)}%</span></div>
    </div>

    <!-- Memory Diagnostics Section -->
    <div class="modal-section">
      <h3 class="modal-section-title">Memory Allocation</h3>
      <div class="modal-gauge-row">
        <span class="modal-gauge-label">RAM Usage</span>
        <div class="modal-gauge-track">
          <div class="modal-gauge-fill ${memClass}" style="width: ${Math.min(100, memPct).toFixed(1)}%"></div>
        </div>
        <span class="modal-gauge-value">${memPct.toFixed(1)}%</span>
      </div>
      <div class="modal-kv"><span class="modal-kv-key">Total RAM</span><span class="modal-kv-value">${escapeHtml(memory?.totalMemory || '')}</span></div>
      <div class="modal-kv"><span class="modal-kv-key">Used RAM</span><span class="modal-kv-value">${escapeHtml(memory?.usedMemory || '')}</span></div>
      <div class="modal-kv"><span class="modal-kv-key">Available RAM</span><span class="modal-kv-value">${escapeHtml(memory?.freeMemory || '')}</span></div>
    </div>
  `;

  // Network Interfaces
  if (networkInterfaces && Object.keys(networkInterfaces).length > 0) {
    html += `
      <div class="modal-section">
        <h3 class="modal-section-title">Network Adapters</h3>
    `;
    for (const [name, addrs] of Object.entries(networkInterfaces)) {
      const ips = Array.isArray(addrs) ? addrs.map((a) => `${a.family}: ${a.address}`).join(', ') : '';
      html += `
        <div class="modal-kv">
          <span class="modal-kv-key">${escapeHtml(name)}</span>
          <span class="modal-kv-value">${escapeHtml(ips)}</span>
        </div>
      `;
    }
    html += `</div>`;
  }

  $sysinfoBody.innerHTML = html;
}

// ── Role-Specific Initialization ─────────────────────────────────────────────
if (role === 'admin') {
  $sidebar.removeAttribute('hidden');
  $statusBar.removeAttribute('hidden');
  updateAdminChatStatus();
} else {
  $sidebar.setAttribute('hidden', '');
  $statusBar.setAttribute('hidden', '');
  $sendBtn.removeAttribute('disabled');
}

window.addEventListener('load', () => {
  $messageInput.focus();
});