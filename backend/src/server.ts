// src/server.ts
import http from 'http';
import app from './app';
import { initializeSockets } from './sockets/socketManager';

const PORT = process.env.PORT || 8080;

// Create HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize WebSockets on the same server
initializeSockets(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 WebSockets initialized`);
});