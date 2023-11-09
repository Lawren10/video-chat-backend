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

let straming;

io.on("connect", async (socket) => {
 // const offer = await localPeer.createOffer();
});
// creating room end

//download stream test.

server.listen(8000, () => {
 console.log("server running at http://localhost:8000");
});
