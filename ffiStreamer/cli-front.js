
const socket = io('http://192.168.122.68:3000')
socket.on('pong', message => {
console.log(message)
});



// // Établir une connexion WebSocket
// const socket = new WebSocket('ws://localhost:3000/ffi_event');

// Sélectionner les éléments du DOM
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const liveview = document.getElementById('live')
const qr = document.getElementById('qr')

// Fonction pour afficher un message dans la page
// function showMessage(message) {
//   const messageElement = document.createElement('div');
//   messageElement.innerText = message;
//   messagesContainer.appendChild(messageElement);
// }

// Événement déclenché lorsqu'une connexion est établie
// socket.addEventListener('open', function (event) {
//   console.log('Connexion WebSocket établie.');
// });

// // Événement déclenché lorsqu'un message est reçu du serveur
socket.addEventListener('stream', function (event) {
  liveview.src = event.data;
});
socket.addEventListener('get-last-photo',(event)=> {

   liveview.src = event.data;
})
socket.addEventListener('build-code',(event)=> {
  console.log(event.data)
 
   liveview.src = event.data.wifiQRCode;
   qr.src = event.data.linkQRCode;
})
socket.addEventListener('shooting',(event)=> {
  const error = document.querySelector('.message')
  if(event.data ==="AF_ERROR"){
    error.style.color ="red"
    error.innerHTML = "Unable to take photo due to autofocus in progres";
  }
  if(event.data ==="DEVICE_BUSY"){
    error.style.color ="red"
    error.innerHTML = "Device is busy";
  }else{
    error.style.color ="#000"
    error.innerHTML = event.data 
  }

})

// Événement déclenché lorsqu'une erreur se produit
// socket.addEventListener('error', function (event) {
//   console.error('Erreur WebSocket:', event);
// });

// // Événement déclenché lorsqu'une connexion est fermée
// socket.addEventListener('close', function (event) {
//   console.log('Connexion WebSocket fermée.');
// });

// Événement de clic sur le bouton d'envoi


const button = document.querySelectorAll('input')

button.forEach((item) => {

  if(item.value ==="stream"){
    item.addEventListener('click',()=> {  
      socket.emit('stream', { data: item.id });
    })
  }
  if(item.value ==="close stream"){
    item.addEventListener('click',()=> {
      socket.emit('close-stream', { data: item.id });
    })
  }
  if(item.id ==="shooting"){
    item.addEventListener('click',()=> socket.emit('shooting', { data: item.id }))
  }
  if(item.id ==="release-all"){
    item.addEventListener('click',()=> socket.emit('release-all', { data: item.id }))
  }
  if(item.id ==="delete"){
    item.addEventListener('click',()=> socket.emit('delete', { data: item.id }))
  }
  if(item.id ==="build-code"){
    item.addEventListener('click',()=> socket.emit('build-code', { data: item.id }))
  }
  if(item.id ==="get-last-photo"){
    item.addEventListener('click',()=> socket.emit('get-last-photo', { data: item.id }))
  }

})