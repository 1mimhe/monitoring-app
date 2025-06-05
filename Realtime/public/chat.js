const socket = io({
  ackTimeout: 10000,
  retries: 3
});

const { pcName, room } = Qs.parse(location.search, { ignoreQueryPrefix: true });
socket.emit('join', { pcName, room });

// Header
document.getElementById('room-name').textContent = `Room: ${room}`;
document.getElementById('pc-name').textContent = `PC: ${pcName}`;

function updateTime() {
  const now = new Date();
  document.getElementById('current-time').textContent = now.toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

const $input = document.getElementById('input');
const $messages = document.getElementById('messages');
const $sendButton = document.getElementById('send');
const $broadcastButton = document.getElementById('broadcast');

// DOM Event Listeners
$sendButton.addEventListener('click', (e) => {
  e.preventDefault();
  $sendButton.setAttribute('disabled', 'disabled');

  if ($input.value) {
    socket.emit('message', $input.value, () => {
      $sendButton.removeAttribute('disabled');
      $input.value = '';
      $input.focus();
    });
  }
});

$broadcastButton.addEventListener('click', (e) => {
  e.preventDefault();
  $broadcastButton.setAttribute('disabled', 'disabled');

  if ($input.value) {
    socket.emit('broadcast', $input.value, () => {
      setTimeout(() => {
        $broadcastButton.removeAttribute('disabled');
      }, 10_000);
      $input.value = '';
      $input.focus();
    });
  }
});

// Socket Event Listeners
socket.on('message', (msg, type = 'normal', sender = 'You') => {
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
  window.scrollTo(0, document.body.scrollHeight);
});