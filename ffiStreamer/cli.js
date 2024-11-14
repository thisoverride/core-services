// const WebSocket = require('ws');
// const os = require('os');


// const identity = {
//   os: os.platform(),
//   osArch: os.arch() ,
//   osVer: os.release(),
//   cpu: os.cpus(),
//   homedir :os.homedir(),
//   host: os.hostname(),
//   usrInfo: os.userInfo()
// }





// URL du serveur WSocket
const serverUrl = 'ws://192.168.122.68:3000';


const socket = new WebSocket(serverUrl);


socket.on('open', function () {
    console.log('Connexion établie');

    
    socket.send('shooting');
});

socket.on('test', function () {
    console.log('joachier');

});

socket.on('message', function (data) {
    console.log('Message du serveur:', data);
});


socket.on('close', function () {
    console.log('Connexion fermée');
});
 

socket.on('error', function (error) {
    console.error('Erreur de connexion:', error);
});
