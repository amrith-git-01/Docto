const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });

const app = require('./app');

//DATABASE CONNECTION
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

const connectDB = async function () {
  try {
    await mongoose
      .connect(DB, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
      })
      .then(() => console.log('Connected to MongoDB'));
  } catch (err) {
    console.log(err.message);
  }
};
connectDB();

// require('./services/emailRemainder');

// SERVER
const port = process.env.PORT || 6000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}...`);
});

// UNHANDLED REJECTION
process.on('unhandledRejection', (err) => {
  console.log(err);
  console.log('UNHANDLED REJECTION!!! SHUTTING DOWN...');
  server.close(() => {
    process.exit(1);
  });
});

// UNCAUGHT EXCEPTION
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION!!! SHUTTING DOWN...');
  server.close(() => {
    process.exit(1);
  });
});
