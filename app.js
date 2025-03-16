const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const cors = require('cors');
const AppError = require('./utils/appError');
const cookieParser = require('cookie-parser');

const globalErrorHandler = require('./controllers/errorController');

const patientRouter = require('./routes/patientRoutes');
const doctorRouter = require('./routes/doctorRoutes');
const clinicRouter = require('./routes/clinicRoutes');
const appointmentRouter = require('./routes/appointmentRoutes');
const referralRouter = require('./routes/referralRoutes');

const app = express();

app.use(
  express.json({
    limit: '10kb',
  })
);

app.use(express.static(path.join(__dirname, 'public')));

app.use(helmet());

app.use(cors());

app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});

app.use('/api', limiter); // Enable rate limiting

app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(xss());
app.use(mongoSanitize());
app.use(hpp());
app.use(compression());

// Routes
app.use('/docto/api/v1/patients', patientRouter);
app.use('/docto/api/v1/doctors', doctorRouter);
app.use('/docto/api/v1/clinics', clinicRouter);
app.use('/docto/api/v1/appointments', appointmentRouter);
app.use('/docto/api/v1/referrals', referralRouter);

// Catch-all route for undefined routes
app.use('*', (req, res, next) => {
  console.log(`Can't find ${req.originalUrl} on this server!`);
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
