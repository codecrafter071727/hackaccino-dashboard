require('dotenv').config();
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./src/routes/adminRoutes');
const teamRoutes = require('./src/routes/teamRoutes');

const http = require('http');
const { initSocket } = require('./src/socket');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.io
initSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);

app.get('/', (req, res) => {
  res.send('Hackaccino Dashboard API is running...');
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
