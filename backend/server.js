const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

// Middleware
const allowedOrigins =
  process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) || [
    'http://localhost:3000'
  ];

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.get('/', (_, res) => {
  res.status(200).send('QA App backend is running');
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/qa-app';

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected');

    const server = app
      .listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(
            `Port ${PORT} is already in use. Please free the port or use a different port.`
          );
          console.error('To find and kill the process using this port, run:');
          console.error(`  netstat -ano | findstr :${PORT}`);
          console.error(`  taskkill /PID <PID> /F`);
        } else {
          console.error('Server error:', err);
        }
        process.exit(1);
      });

    const gracefulShutdown = () => {
      console.log('Gracefully shutting down server...');
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();

    console.log('MongoDB Connected');

    const server = app
      .listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      })
      .on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(
            `Port ${PORT} is already in use. Please free the port or use a different port.`
          );
          console.error('To find and kill the process using this port, run:');
          console.error(`  netstat -ano | findstr :${PORT}`);
          console.error(`  taskkill /PID <PID> /F`);
        } else {
          console.error('Server error:', err);
        }
        process.exit(1);
      });

    const gracefulShutdown = () => {
      console.log('Gracefully shutting down server...');
      server.close(() => {
        mongoose.connection.close(false, () => {
          console.log('MongoDB connection closed.');
          process.exit(0);
        });
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();
