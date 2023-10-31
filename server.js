const express = require("express");
const http = require("http");
const Server = require("socket.io").Server;
const cors = require("cors");
const calleWrtc = require("wrtc");

const app = express();
const server = http.createServer(app);

app.use(cors);
const io = new Server(server, {
 cors: {
  origin: "*",
 },
});

io.on("connect", async (socket) => {
 let socketId = socket.id;
 console.log("socket connected", socketId);

 // creating room
 socket.on("createRoom", async (credential) => {
  const server = {
   "ice server": [
    { url: "stun1.l.google.com:19302" },
    { url: "stun2.l.google.com:19302" },
    {
     url: "turn:192.158.29.39:3478?transport=tcp",
     credential: "JZEOEt2V3Qb0y27GRntt2u2PAYA=",
     username: "28224511:1379330808",
    },
   ],
  };

  const serverPeer = new calleWrtc.RTCPeerConnection(server);
  serverPeer.setRemoteDescription(
   new calleWrtc.RTCSessionDescription(credential.clientOffer)
  );

  // server

  console.log("server remote disc set");

  const serverAnswer = await serverPeer.createAnswer();
  await serverPeer.setLocalDescription(serverAnswer);

  console.log("server answer created and set as local discription");

  socket.emit("getServerAnswer", serverAnswer);

  socket.on("sendingIceCandidates", (clientIce) => {
   console.log("client ice candidate", clientIce.iceCanditate);

   serverPeer.addIceCandidate(clientIce.iceCanditate);
  });

  // const offer = await localPeer.createOffer();
  console.log(serverPeer._listeners);

  socket.serverWrtc = serverPeer;

  socket.join(credential.roomId);
  console.log(
   "socket in room",
   // io.sockets.adapter.rooms.get(credential.roomId),
   socket.serverWrtc.localDescription,
   socket.serverWrtc.remoteDescription,
   socket.serverWrtc.iceGatheringState,
   socket.serverWrtc.iceConnectionState
  );
 });
});

server.listen(8000, () => {
 console.log("server running at http://localhost:8000");
});
