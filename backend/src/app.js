import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import compilerRoutes from './routes/compiler.routes.js';
import examRoutes from './routes/exam.routes.js';
import submissionRoutes from './routes/submission.routes.js';
import violationRoutes from './routes/violation.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { sendTestEmail } from './services/emailService.js';

const app = express();

// 🚨 THE REAL VIP LIST 🚨
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://exam-proctar.vercel.app' // NO trailing slash!
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman) or allowed origins
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.error('CORS Blocked:', origin); // Prints to Render logs if someone gets blocked
      callback(new Error('CORS Policy Blocked this request'));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/compiler',    compilerRoutes);
app.use('/api/exams',       examRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/violations',  violationRoutes);
app.use('/api/admin',       adminRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/test', (_req, res) => {
  res.json({ message: 'NEXUS PROCTOR backend is live 🚀', timestamp: new Date().toISOString() });
});

// ── SMTP Diagnostic ───────────────────────────────────────────
app.get('/test-email', async (_req, res) => {
  try {
    const user = process.env.EMAIL_USER;
    if (!user) throw new Error("EMAIL_USER not configured in .env");
    
    await sendTestEmail(user);
    res.send("MAIL SENT");
  } catch (err) {
    console.error(err);
    res.send(err.message);
  }
});

// ── Global error handler ──────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Global error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

export default app;
