const express = require('express');
const createHttpError = require('http-errors');
const ejs = require('ejs');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();
const session = require('express-session');
const connectFlash = require('connect-flash');
const passport = require('passport');
const { roles } = require('./utils/constants');
const serverless = require('serverless-http');  // Ensure this is required for serverless deployment
const MongoStore = require('connect-mongo'); // Import directly
const path = require('path');

const app = express();

app.use(morgan('dev'));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Session handling for Vercel (with a fallback for production)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure cookies in production
      sameSite: 'Strict',
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI, 
      dbName: process.env.DB_NAME,
      ttl: 60 * 60, // 1 hour session expiry
    }),
  })
);

app.use(passport.initialize());
app.use(passport.session());
require('./utils/passport.auth');

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use(connectFlash());
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  next();
});

mongoose.connect(process.env.MONGO_URI,{
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 100000,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log(err.message));

app.use('/', require('./routes/index.route'));
app.use('/auth', require('./routes/auth.route'));
app.use('/user', ensureAuthenticated, require('./routes/user.route'));

app.use(
  '/admin', ensureAuthenticated, ensureAdmin,
  require('./routes/admin.route')
);

app.use('/complaints', require('./routes/complaint.route'));

// 404 handler
app.use((req, res, next) => {
  next(createHttpError.NotFound());
});

// General error handler
app.use((error, req, res, next) => {
  error.status = error.status || 500;
  res.status(error.status);
  res.render('error_40x', { error });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  } else {
    res.redirect('/auth/login');
  }
}

function ensureAdmin(req, res, next) {
  if (!req.user) {
    req.flash('error', 'You must be logged in as an admin');
    return res.redirect('/auth/login');
  }

  if ([roles.admin1, roles.admin2, roles.admin3, roles.admin4].includes(req.user.role)) {
    return next();
  } else {
    req.flash('warning', 'You are not authorized to see this route');
    return res.redirect('/');
  }
}


module.exports = (req, res) => {
  app(req, res);
};
