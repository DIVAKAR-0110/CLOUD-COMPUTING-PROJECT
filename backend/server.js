require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // Allow all for initial cloud setup
    methods: ['GET', 'POST'],
  },
});

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// More flexible CORS for cloud deployment
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  /\.vercel\.app$/, // Allow all Vercel subdomains
  /\.amplifyapp\.com$/ // Allow all AWS Amplify subdomains
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(ao => (ao instanceof RegExp ? ao.test(origin) : ao === origin))) {
      return callback(null, true);
    }
    return callback(null, true); // For now, allowing all during setup
  },
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/metrics', require('./routes/metrics'));
app.use('/api/alerts', require('./routes/alerts'));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date(), server: 'Cloud Monitor API' });
});

// Real-time CPU Monitoring via Socket.IO
const si = require('systeminformation');
let monitoringInterval = null;

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('start-monitoring', async () => {
    console.log(`Monitoring started for: ${socket.id}`);
    monitoringInterval = setInterval(async () => {
      try {
        const [cpu, mem, load, processes] = await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.cpuTemperature(),
          si.processes(),
        ]);

        const metrics = {
          timestamp: new Date().toISOString(),
          cpu: {
            totalLoad: parseFloat(cpu.currentLoad.toFixed(2)),
            userLoad: parseFloat(cpu.currentLoadUser.toFixed(2)),
            systemLoad: parseFloat(cpu.currentLoadSystem.toFixed(2)),
            cores: cpu.cpus.map((c, i) => ({
              core: i + 1,
              load: parseFloat(c.load.toFixed(2)),
            })),
          },
          memory: {
            total: mem.total,
            used: mem.used,
            free: mem.free,
            usedPercent: parseFloat(((mem.used / mem.total) * 100).toFixed(2)),
          },
          temperature: load.main || 0,
          topProcesses: processes.list
            .sort((a, b) => b.cpu - a.cpu)
            .slice(0, 5)
            .map((p) => ({ name: p.name, cpu: parseFloat(p.cpu.toFixed(2)), mem: parseFloat(p.mem.toFixed(2)) })),
          isSpiking: cpu.currentLoad > 80,
        };

        socket.emit('metrics', metrics);

        // Save to DB if spiking
        if (metrics.isSpiking) {
          const Metric = require('./models/Metric');
          await Metric.create({
            cpuLoad: metrics.cpu.totalLoad,
            memoryUsed: metrics.memory.usedPercent,
            isSpiking: true,
            topProcesses: metrics.topProcesses,
          });
        }
      } catch (err) {
        console.error('Monitoring error:', err.message);
      }
    }, 2000);
  });

  socket.on('stop-monitoring', () => {
    if (monitoringInterval) clearInterval(monitoringInterval);
    console.log(`Monitoring stopped for: ${socket.id}`);
  });

  socket.on('disconnect', () => {
    if (monitoringInterval) clearInterval(monitoringInterval);
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📊 Real-time monitoring via Socket.IO active`);
  console.log(`🌐 Health: http://localhost:${PORT}/api/health\n`);
});
