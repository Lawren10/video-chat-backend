const { mediaSoupConfig } = require("./mediaSoupInit");

const roomInit = async (
 action,
 nameOrId,
 calleWorker,
 socket,
 Routers,
 userName
) => {
 // on creating a new room a new router is created each time to handle all straming activities for the room.
 let roomId;
 let calleRouter;
 if (action === "createRoom") {
  //creating the router to handle all producer and consumer streams for the particular room.
  calleRouter = await calleWorker.createRouter({
   mediaCodecs: mediaSoupConfig.routerConfig.mediaCodecs,
  });

  roomId = `${nameOrId}-meeting-${socket.id.slice(0, 8)}`;
  Routers[roomId] = calleRouter;

  socket.routerId = roomId;
  socket.userName = nameOrId;
 }

 if (action === "joinRoom") {
  roomId = nameOrId;

  if (!Routers[roomId]) {
   console.log("room id not found");
   socket.emit("roomId-error");
   return;
  }

  calleRouter = Routers[roomId];

  socket.routerId = roomId;
  socket.userName = userName;
 }

 console.log("roomId", roomId);

 socket.join(roomId);

 socket.emit("saveRoomId", roomId);

 socket.emit("loadRouterRtpCapablities", calleRouter.rtpCapabilities);
};

const createServerProducer = async (Routers, socket) => {
 let roomRouter = Routers[socket["routerId"]];

 const serverStreamProducerTransport = await roomRouter.createWebRtcTransport(
  mediaSoupConfig.webrtcTransportConfig
 );

 serverStreamProducerTransport.on("dtlsstatechange", (dtlsState) => {
  console.log(dtlsState);

  if (dtlsState === "connected") {
   console.log("server connected to clent");
  }
 });

 serverStreamProducerTransport.on("close", () => {
  console.log("producer transport closed");
 });

 socket["serverProducerTransport"] = serverStreamProducerTransport;

 let connectionParams = {
  id: serverStreamProducerTransport.id,
  iceParameters: serverStreamProducerTransport.iceParameters,
  iceCandidates: serverStreamProducerTransport.iceCandidates,
  dtlsParameters: serverStreamProducerTransport.dtlsParameters,
 };

 socket.emit("createClientProducerTransport", connectionParams);
};

const sendTransportConnect = async (socket, clientTransportParam) => {
 let serverProducerTransport = socket.serverProducerTransport;
 await serverProducerTransport.connect(clientTransportParam);
 console.log("serever transport connected to client");
};

const sendTransportProduce = async (
 roomId,
 socket,
 clientTransportParam,
 callBack,
 calleIo
) => {
 let serverProducerTransport = socket.serverProducerTransport;

 let producer = await serverProducerTransport.produce(clientTransportParam);

 producer.on("transportclose", () => {
  producer.close();
 });

 if (clientTransportParam.kind === "video") {
  socket["serverVideoProducer"] = producer;
 }

 if (clientTransportParam.kind === "audio") {
  socket["serverAudioProducer"] = producer;

  let room = calleIo.sockets.adapter.rooms.get(roomId);
  if (room.size > 1) {
   let allConnectedPeersocketId = [...room].filter(
    (socketid) => socketid !== socket.id
   );

   socket.emit("get all connected peer", allConnectedPeersocketId);
   socket.to(roomId).emit("new peer joined", socket.id);
  }
 }

 callBack({ id: producer.id });
};

const createServerConsumerTransport = async (peerId, Routers, socket) => {
 console.log("creating server consumer transport");
 const roomRouter = Routers[socket.routerId];

 const serverStreamConsumerTransport = await roomRouter.createWebRtcTransport(
  mediaSoupConfig.webrtcTransportConfig
 );

 serverStreamConsumerTransport.on("dtlsstatechange", (dtlsState) => {
  if (dtlsState === "close") serverStreamConsumerTransport.close();
 });

 serverStreamConsumerTransport.on("close", () => {
  console.log("consumer transport closed");
 });

 if (!socket["serverConsumerTransports"]) {
  socket["serverConsumerTransports"] = {};
 }

 let transportDetails = {
  consumerTransport: serverStreamConsumerTransport,
  peerToConnectId: peerId,
 };

 socket["serverConsumerTransports"][peerId] = transportDetails;

 let connectionParams = {
  id: serverStreamConsumerTransport.id,
  iceParameters: serverStreamConsumerTransport.iceParameters,
  iceCandidates: serverStreamConsumerTransport.iceCandidates,
  dtlsParameters: serverStreamConsumerTransport.dtlsParameters,
 };

 socket.emit("createClientConsumerTransport", connectionParams, peerId);
};

const sendConsumerConnect = async (
 socket,
 clientConsumerParam,
 peerToConnectId
) => {
 console.log("server consumer transport connecting to client");
 let serverConsumerTransport =
  socket.serverConsumerTransports[peerToConnectId].consumerTransport;
 await serverConsumerTransport.connect(clientConsumerParam);
};

const createConsumerStream = async (Routers, socket, param, calleIo) => {
 console.log("creating server consumers and sending params to client");
 // console.log("peertoconnectid", param.peerToConnectId);

 const roomRouter = Routers[socket.routerId];
 let consumerTransportObj =
  socket.serverConsumerTransports[param.peerToConnectId];

 // console.log("peertoconnectidObject", consumerTransportObj);
 // return;
 let producerTransport = calleIo.sockets.sockets.get(param.peerToConnectId);
 const serverConsumerTransport = consumerTransportObj.consumerTransport;
 const serverVideoProducer = producerTransport["serverVideoProducer"];
 const serverAudioProducer = producerTransport["serverAudioProducer"];
 let serverVideoConsumer;
 let serverAudioConsumer;

 if (
  roomRouter.canConsume({
   producerId: serverVideoProducer.id,
   rtpCapabilities: param.rtpCapabilities,
  })
 ) {
  serverVideoConsumer = await serverConsumerTransport.consume({
   producerId: serverVideoProducer.id,
   rtpCapabilities: param.rtpCapabilities,
   paused: true,
  });

  serverAudioConsumer = await serverConsumerTransport.consume({
   producerId: serverAudioProducer.id,
   rtpCapabilities: param.rtpCapabilities,
   paused: true,
  });
 }

 serverVideoConsumer.on("transportclose", () => {
  console.log("consumer transport closed");
 });

 serverVideoConsumer.on("producerclose", () => {
  console.log("consumer producer closed");
 });

 serverAudioConsumer.on("transportclose", () => {
  console.log("consumer transport closed");
 });

 serverAudioConsumer.on("producerclose", () => {
  console.log("consumer producer closed");
 });

 let sendParam = {
  videoStreamParam: {
   id: serverVideoConsumer.id,
   producerId: serverVideoProducer.id,
   kind: serverVideoConsumer.kind,
   rtpParameters: serverVideoConsumer.rtpParameters,
  },

  AudioStreamParam: {
   id: serverAudioConsumer.id,
   producerId: serverAudioProducer.id,
   kind: serverAudioConsumer.kind,
   rtpParameters: serverAudioConsumer.rtpParameters,
  },

  peerToConnectId: param.peerToConnectId,
  socketUserName: producerTransport.userName,
 };

 socket.serverConsumerTransports[param.peerToConnectId]["serverVideoConsumer"] =
  serverVideoConsumer;

 socket.serverConsumerTransports[param.peerToConnectId]["serverAudioConsumer"] =
  serverAudioConsumer;

 socket.emit("consumeStream", sendParam);
};

const resumeConsumerPlayBack = async (socket, peerToConnectId) => {
 let serverVideoConsumer =
  socket.serverConsumerTransports[peerToConnectId]["serverVideoConsumer"];

 let serverAudioConsumer =
  socket.serverConsumerTransports[peerToConnectId]["serverAudioConsumer"];
 await serverVideoConsumer.resume();
 await serverAudioConsumer.resume();
};

module.exports = {
 roomInit,
 createServerProducer,
 sendTransportConnect,
 sendTransportProduce,
 createServerConsumerTransport,
 sendConsumerConnect,
 createConsumerStream,
 resumeConsumerPlayBack,
};
