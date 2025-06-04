const socket = io();

const pcName = prompt('Enter your PC name:');
socket.emit('init', pcName);

const input = document.getElementById('input');
const messages = document.getElementById('messages');

document.getElementById('send').addEventListener('click', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('message', input.value);
    input.value = '';
  }
});

document.getElementById('broadcast').addEventListener('click', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('broadcast', input.value);
    input.value = '';
  }
});

socket.on('message', (msg) => {
  const item = document.createElement('li');
  item.textContent = msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});