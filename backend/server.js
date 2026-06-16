import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import { setupProctorSockets } from './src/sockets/proctorSocket.js';
import { sendEmail } from './src/services/emailService.js';
// Import models to initialize associations
import './src/models_sql/index.js';

// Cleaned up outdated Nodemailer logs
// ── SMTP Test Route (Step 4) ───────────────────────────────────
app.get("/test-email", async (req, res) => {
  try {
    await sendEmail();
    res.send("Email function executed - Check console for ✅ MAIL SENT");
  } catch (err) {
    res.status(500).send("Email failed: " + err.message);
  }
});

const startServer = async () => {
  // 1. Validate ENV
  if (!process.env.JWT_SECRET) {
    console.error("❌ FATAL ERROR: Missing JWT_SECRET in environment variables.");
    process.exit(1);
  }

  try {
    // 2. Connect MySQL/Sequelize
    await connectDB();

    // 3. Start Express server
    const PORT = process.env.PORT || 5002; // Using 5002 as per .env and recent history
    const httpServer = createServer(app);

    // 4. Initialize Socket.IO
    const io = new Server(httpServer, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    setupProctorSockets(io);

    httpServer.listen(PORT, () => {
      console.log(`🚀 NEXUS PROCTOR backend running on port ${PORT}`);
      console.log(`📡 Socket.io ready for real-time proctoring`);
    });

    // Handle server errors
    httpServer.on('error', (err) => {
      console.error('❌ Server error:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
      }
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

startServer();
