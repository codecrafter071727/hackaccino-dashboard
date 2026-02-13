require('dotenv').config();
const express = require('express');
const cors = require('cors');
const adminRoutes = require('./src/routes/adminRoutes');
const teamRoutes = require('./src/routes/teamRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);

app.get('/', (req, res) => {
  res.send('Hackaccino Dashboard API is running...');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
