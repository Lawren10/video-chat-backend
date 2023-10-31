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

  serverPeer.socketId = socket.id;
  serverPeer.roomId = credential.roomId;

  serverPeer.ontrack = (e) => {
   console.log(e);
   // e.streams.getTracks().forEach((item) => {
   //  console.log(item);
   // });

   // remoteStream.forEach((element) => {
   //  console.log("track stream", element.id);
   //  // serverPeer.addTrack(element, remoteStream);
   // });
   // console.log("form ontrack serverId", serverPeer.socketId);
   // console.log("form ontrack RoomId", serverPeer.roomId);
   // const currentSocket = io.sockets.sockets.get(serverPeer.socketId);
   // currentSocket.emit("sending stream", remoteStream);
   // console.log(io.sockets.sockets.get(serverPeer.socketId));
   // console.log("stream evnt T", e.transceiver);/

   // remoteStream.forEach((element) => {
   //  console.log("track stream", element.id);
   // });
   // console.log("tracks streamed", remoteStream);
  };

  socket.serverWrtc = serverPeer;

  // server

  console.log("server remote disc set");

  const serverAnswer = await serverPeer.createAnswer();
  await serverPeer.setLocalDescription(serverAnswer);

  console.log("server answer created and set as local discription");

  socket.emit("getServerAnswer", serverAnswer);

  socket.on("sendingClientIceCandidates", (clientIce) => {
   // console.log("client ice candidate saving", clientIce.iceCanditate);

   serverPeer.addIceCandidate(clientIce.iceCanditate);
  });

  // const offer = await localPeer.createOffer();

  socket.join(credential.roomId);
  console.log(
   "socket in room"
   // socket.serverWrtc.remoteDescription
  );
 });
 // creating room end
});

server.listen(8000, () => {
 console.log("server running at http://localhost:8000");
});
