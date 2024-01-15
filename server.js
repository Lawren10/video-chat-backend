const express = require("express");
const http = require("http");
const Server = require("socket.io").Server;
const cors = require("cors");
const { worker } = require("./controls/mediaSoupInit");
const {
 roomInit,
 createServerProducer,
 sendTransportConnect,
 sendTransportProduce,
 createServerConsumerTransport,
 sendConsumerConnect,
 createConsumerStream,
 resumeConsumerPlayBack,
} = require("./controls/eventControls");

let calleWorker;
const app = express();
const server = http.createServer(app);

worker.then((w) => {
 calleWorker = w;
});

app.use(cors);
const calleIo = new Server(server, {
 cors: {
  origin: "*",
 },
});

let Routers = {};

calleIo.on("connect", async (socket) => {
 console.log("connected", socket.id);

 socket.on("create room", async (action, userName) => {
  await roomInit(action, userName, calleWorker, socket, Routers);
 });

 // join room function

 socket.on("join room", async (action, roomid, userName) => {
  await roomInit(action, roomid, calleWorker, socket, Routers, userName);
 });

 socket.on("createServerProducer", async () => {
  await createServerProducer(Routers, socket);
 });

 socket.on("sendTransportConnect", async (clientTransportParam) => {
  await sendTransportConnect(socket, clientTransportParam);
 });

 socket.on(
  "sendTransportProduce",
  async (roomId, clientTransportParam, callBack) => {
   await sendTransportProduce(
    roomId,
    socket,
    clientTransportParam,
    callBack,
    calleIo
   );
  }
 );

 socket.on("createServerConsumerTransport", async (peerId) => {
  await createServerConsumerTransport(peerId, Routers, socket);
 });

 socket.on(
  "sendConsumerConnect",
  async (clientConsumerParam, peerToConnectId) => {
   await sendConsumerConnect(socket, clientConsumerParam, peerToConnectId);
  }
 );

 socket.on("createConsumerStream", async (param) => {
  await createConsumerStream(Routers, socket, param, calleIo);
 });

 socket.on("resumeConsumerPlayBack", async (peerToConnectId) => {
  await resumeConsumerPlayBack(socket, peerToConnectId);
 });

 //events for handling video and interactivities

 socket.on("raiseHand", (id, state) => {
  let roomId = socket.routerId;
  socket.to(roomId).emit("updateRaiseHand", id, state);
 });

 socket.on("cameraState", (id, state) => {
  let roomId = socket.routerId;
  socket.to(roomId).emit("updateCameraState", id, state);
 });

 socket.on("audioState", (id, state) => {
  let roomId = socket.routerId;
  socket.to(roomId).emit("updateAudioState", id, state);
 });

 //events for handling chats updates

 socket.on("chatMessage", (chatMessage, roomId) => {
  socket.to(roomId).emit("broadcastMessage", socket.userName, chatMessage);
 });

 socket.on("sharingScreen", (roomId) => {
  socket.to(roomId).emit("userSharingScreen", socket.id);
 });

 //events for handling screen sharing updates

 socket.on("stopScreenSharing", (roomId) => {
  socket.to(roomId).emit("stopRemoteScreenSharing");
 });
});

server.listen(8000, () => {
 console.log("server running at http://localhost:8000");
});
