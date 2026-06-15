import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { setupProctorSockets } from './sockets/proctorSocket.js';
// Import models to initialize associations
import './models_sql/index.js';

dotenv.config();

const startServer = async () => {
  // 1. Validate ENV
  if (!process.env.JWT_SECRET) {
    console.error("❌ FATAL ERROR: Missing JWT_SECRET in environment variables.");
    process.exit(1);
  }

  // 2. Connect MySQL/Sequelize
  await connectDB();

  // 3. Start Express server
  const PORT = process.env.PORT || 5001;
  const httpServer = createServer(app);

  // 4. Initialize Socket.IO with the REAL VIP LIST
  const allowedOrigins = [
    'http://localhost:5173',
    'https://exam-proctar.vercel.app' 
  ];

  const io = new Server(httpServer, {
    cors: { 
      origin: allowedOrigins, 
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true 
    },
  });

  setupProctorSockets(io);

  httpServer.listen(PORT, () => {
    console.log(`🚀 NEXUS PROCTOR backend running on port ${PORT}`);
    console.log(`📡 Socket.io ready for real-time proctoring`);
  });
};

startServer();
