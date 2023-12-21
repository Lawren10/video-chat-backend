const mediaSoup = require("mediasoup");
const os = require("node:os");

// export const calleWorker = mediaSoup.createWorker();

const mediaSoupConfig = {
 listenIp: "0.0.0.0",
 listenPort: 4000,

 workerConfig: {
  numOfWorkers: Object.keys(os.cpus()).length,
  workerOptions: {
   logLevel: "error",
   rtcMinPort: 10000,
   rtcMaxPort: 59999,
   logTags: [" info", "ice", "dtls", "rtp", "srtp", "rtcp"],
  },
 },

 routerConfig: {
  mediaCodecs: [
   {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2,
   },

   {
    kind: "video",
    mimeType: "video/VP8",
    clockRate: 90000,
    parameters: {
     "x-google-start-bitrate": 1000,
    },
   },
  ],
 },

 webrtcTransportConfig: {
  listenInfos: [
   {
    ip: "0.0.0.0",
    announcedIp: "127.0.0.1",
   },
  ],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
 },
};

let worker = mediaSoup.createWorker(mediaSoupConfig.workerConfig.workerOptions);

module.exports = {
 worker,
 mediaSoupConfig,
};
