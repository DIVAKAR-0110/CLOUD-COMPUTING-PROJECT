# ⚡ CloudMonitor — Team 12
### Monitor and Analyze Server CPU Performance

> **Cloud-Based Web Application** | Real-time CPU Monitoring | JWT Auth | MongoDB Atlas | Socket.IO

---

## 📋 Problem Statement
**Monitor your server's CPU usage under load.**
- Identify CPU spikes in real-time
- Explain performance behavior through analysis
- Deploy a secure, cloud-based web application where users interact via a dashboard and data is stored securely in MongoDB Atlas.

---

## 🏗️ Project Architecture

```
CLOUD PROJECT/
├── backend/                  # Node.js + Express API Server
│   ├── config/
│   │   └── db.js             # MongoDB connection
│   ├── middleware/
│   │   └── auth.js           # JWT authentication middleware
│   ├── models/
│   │   ├── User.js           # User model (bcrypt hashed passwords)
│   │   ├── Metric.js         # CPU metric records
│   │   └── Alert.js          # CPU spike alerts
│   ├── routes/
│   │   ├── auth.js           # /api/auth — register, login, me
│   │   ├── metrics.js        # /api/metrics — history, summary
│   │   └── alerts.js         # /api/alerts — list, create, resolve
│   ├── .env                  # Environment variables (not in git)
│   ├── server.js             # Main server + Socket.IO
│   └── package.json
│
├── frontend/                 # Vanilla JS + Vite + Chart.js
│   ├── src/
│   │   ├── main.js           # App logic (auth, charts, socket)
│   │   └── style.css         # Premium dark-mode UI
│   ├── index.html            # SPA shell
│   ├── vite.config.js        # Dev proxy config
│   └── package.json
│
├── .gitignore
├── package.json              # Root scripts
└── README.md
```

---

## 🚀 Tech Stack

| Layer        | Technology                        |
|-------------|-----------------------------------|
| Frontend     | HTML5, Vanilla JS, Chart.js, Vite |
| Backend      | Node.js, Express.js               |
| Real-time    | Socket.IO (WebSockets)            |
| Database     | MongoDB Atlas (Cloud)             |
| Auth         | JWT + bcryptjs                    |
| Monitoring   | systeminformation (npm)           |
| Security     | Helmet, CORS, Rate Limiting       |
| Deployment   | Render (backend) + Vercel (frontend) |

---

## 🔧 Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (free tier works)
- Git

### Step 1 — Clone & Install

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2 — Configure Environment

Edit `backend/.env`:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/cloudmonitor
JWT_SECRET=your_strong_secret_here
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

> Get your `MONGO_URI` from [MongoDB Atlas](https://cloud.mongodb.com)
> → Create Cluster → Connect → Connect your application

### Step 3 — Run Locally

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
# Server starts at http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App opens at http://localhost:3000
```

---

## 📡 API Reference

### Auth Endpoints
| Method | Endpoint            | Description         | Auth Required |
|--------|---------------------|---------------------|---------------|
| POST   | `/api/auth/register`| Create account      | No            |
| POST   | `/api/auth/login`   | Login & get token   | No            |
| GET    | `/api/auth/me`      | Get current user    | Yes (JWT)     |

### Metrics Endpoints
| Method | Endpoint                    | Description              | Auth Required |
|--------|-----------------------------|--------------------------|---------------|
| GET    | `/api/metrics?hours=1`      | Fetch historical metrics | Yes           |
| GET    | `/api/metrics/summary`      | Stats: avg, max, spikes  | Yes           |
| DELETE | `/api/metrics`              | Clear all records        | Yes           |

### Alerts Endpoints
| Method | Endpoint                    | Description              | Auth Required |
|--------|-----------------------------|--------------------------|---------------|
| GET    | `/api/alerts`               | List all alerts          | Yes           |
| POST   | `/api/alerts`               | Create alert             | Yes           |
| PATCH  | `/api/alerts/:id/resolve`   | Resolve an alert         | Yes           |

### Real-time (Socket.IO)
```javascript
// Client emits:
socket.emit('start-monitoring')   // Begin polling every 2s
socket.emit('stop-monitoring')    // Stop polling

// Server emits back:
socket.on('metrics', (data) => {
  // data.cpu.totalLoad — overall CPU %
  // data.cpu.cores     — per-core breakdown
  // data.memory        — RAM usage
  // data.isSpiking     — true if CPU > 80%
  // data.topProcesses  — top 5 CPU processes
})
```

---

## 📊 Dashboard Features

| Page        | Features |
|-------------|----------|
| **Overview**    | Live CPU %, Memory %, temp, spike status, core bars, mini chart |
| **Live Monitor**| Real-time line chart, top processes, memory doughnut |
| **History**     | Bar chart of historical CPU loads (1h / 6h / 24h), colored red for spikes |
| **Alerts**      | Log of all CPU spike alerts with resolve button |
| **Analysis**    | Educational breakdown of CPU spikes + live report |

---

## 🧠 CPU Spike Detection Logic

```
Every 2 seconds:
  1. Poll systeminformation for CPU load
  2. Stream via Socket.IO to connected clients
  3. IF cpu.totalLoad > 80%:
       → Set isSpiking = true
       → Save spike record to MongoDB Atlas
       → Fire visual alert in dashboard
       → Show warning toast notification
```

---

## ☁️ Cloud Deployment

### Backend → Render.com
1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service
3. Connect your GitHub repo → select `/backend`
4. Build command: `npm install`
5. Start command: `node server.js`
6. Add environment variables from `.env`

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → New Project
2. Connect GitHub repo → select `/frontend`
3. Framework preset: **Vite**
4. Add env: `VITE_API_URL=https://your-render-backend.onrender.com`
5. Deploy!

---

## 🔐 Security Measures

| Measure            | Implementation |
|--------------------|----------------|
| Password Hashing   | bcryptjs (12 salt rounds) |
| Authentication     | JWT tokens (7-day expiry) |
| Rate Limiting      | 200 req / 15 min per IP |
| HTTP Security      | Helmet.js headers |
| CORS               | Whitelist frontend origin only |
| Input Validation   | Mongoose schema validation |

---

## 👥 Team 12

| Role              | Technology Used |
|-------------------|-----------------|
| Backend Dev       | Node.js, Express, Socket.IO |
| Database          | MongoDB Atlas, Mongoose |
| Frontend Dev      | Vanilla JS, Chart.js, Vite |
| DevOps / Deploy   | Render, Vercel, GitHub |
| Monitoring Engine | systeminformation |

---

## 📚 References

- [systeminformation docs](https://systeminformation.io/)
- [Socket.IO docs](https://socket.io/docs/v4/)
- [MongoDB Atlas](https://www.mongodb.com/atlas)
- [Chart.js docs](https://www.chartjs.org/docs/)
- [Render deployment](https://render.com/docs)
