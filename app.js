
const express = require('express')
const createHttpError = require('http-errors')
const ejs = require('ejs'); // Ensure EJS is required
const morgan = require('morgan')
const mongoose = require('mongoose')
require('dotenv').config()
const session = require('express-session');
const connectFlash = require('connect-flash');
const passport = require('passport')
const { roles } = require('./utils/constants');
const serverless = require('serverless-http'); 
// const connectMongo = require('connect-mongo');
const path = require('path');

const app = express();
// const PORT = process.env.PORT || 8000;

app.use(morgan('dev'));
app.set('view engine' , 'ejs');
app.set('views', path.join(__dirname, 'views')); 
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended:false}));
const MongoStore = require('connect-mongo'); // Import directly

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,  // Set to true if using HTTPS
      },
      store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,  // Use the mongoUrl from the .env file
        dbName: process.env.DB_NAME,      // Use the database name from the .env file
        ttl: 60 * 60,                     // Session expiration time in seconds (1 hour)
      }),
    })
  );
app.use(passport.initialize())
app.use(passport.session())
require('./utils/passport.auth');

app.use((req,res,next)=>{
    res.locals.user=req.user;
    next();
})


app.use(connectFlash());
app.use((req,res,next)=>{
   res.locals.messages=req.flash();
   next();
})
mongoose.connect(process.env.MONGO_URI).then(() => {console.log('connected');
// app.listen(PORT, () => console.log(`RUNNING`));
})
    .catch(err => console.log(err.message));


app.use('/', require('./routes/index.route'));
app.use('/auth',require('./routes/auth.route'))
app.use('/user',ensureAuthenticated,require('./routes/user.route'))

app.use(
    '/admin',ensureAuthenticated,
    ensureAdmin,
    require('./routes/admin.route')
  );
  
app.use('/complaints', require('./routes/complaint.route'));


app.use((req, res, next) => {
    next(createHttpError.NotFound());
})

app.use((error, req, res, next) => {
    error.status = error.status || 500;
    res.status(error.status);
    res.render('error_40x',{error});
})

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect('/auth/login');
  }
}

function ensureAdmin(req, res, next) {
    if (!req.user) {
        req.flash('error', 'You must be logged in as an admin');
        return res.redirect('/auth/login');
    }
    
    if (req.user.role === roles.admin1 || req.user.role === roles.admin2 || req.user.role === roles.admin3 ||req.user.role === roles.admin4) {
        return next();
    } else {
        req.flash('warning', 'You are not authorized to see this route');
        return res.redirect('/');
    }
}
function ensureModerator(req, res, next) {
    if (!req.user) {
        req.flash('error', 'You must be logged in as an admin');
        return res.redirect('/auth/login');
    }
    
    if (req.user.role === roles.moderator) {
        return next();
    } else {
        req.flash('warning', 'You are not authorized to see this route');
        return res.redirect('/');
    }
}

module.exports = (req, res) => {
  app(req, res);
};
