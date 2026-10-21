// const express = require('express');
// const cors = require('cors');
// const dotenv = require('dotenv');

// dotenv.config();

// const connectDB = require('./config/db');
// connectDB();

// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());

// // Test route
// app.get('/', (req, res) => {
//   res.json({ message: "Backend running successfully 🚀" });
// });

// // ✅ IMPORTANT ROUTES
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/attendance', require('./routes/attendanceRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/chat', require('./routes/chatRoutes')); // 🔥 THIS LINE

// const PORT = process.env.PORT || 5000;

// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));