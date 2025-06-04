const socket = io({
  ackTimeout: 10000,
  retries: 3
});

const pcName = prompt('Enter your PC name:');
socket.emit('init', pcName);

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