import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server);

io.on("connection", async (socket) => {
  console.log("socket connected");
});

app.get("/", async (req, res) => {
  res.send("App connected succesfully");
});

server.listen(8000, () => {
  console.log("server running at http://localhost:8000");
});
