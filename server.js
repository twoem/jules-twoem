require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views'));

// Static files middleware
app.use(express.static(path.join(__dirname, 'public')));

// Body parsing middleware (for form data)
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded bodies
app.use(express.json()); // To parse JSON bodies

const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');

// Middleware
app.use(cookieParser()); // Use cookie-parser

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'a_very_strong_secret_key_fallback', // Fallback if not in .env
    resave: false,
    saveUninitialized: true, // Can be false if login is mandatory for sessions
    cookie: {
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        maxAge: 1000 * 60 * 60 * 24 // Example: 1 day session cookie
    }
}));

// Flash messages middleware
app.use(flash());

// Middleware to make flash messages available to all templates
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error'); // For express-validator errors or other single errors
    // To make user/admin info available globally in templates if logged in (optional here, as often passed directly)
    // res.locals.admin = req.admin || null;
    // res.locals.student = req.student || null;
    next();
});


// Import routes
const mainRoutes = require('./src/routes/mainRoutes');
const adminRoutes = require('./src/routes/adminRoutes'); // Import admin routes

// Use routes
app.use('/', mainRoutes); // Mount main routes
app.use('/admin', adminRoutes); // Mount admin routes under /admin prefix
const studentRoutes = require('./src/routes/studentRoutes'); // Import student routes
app.use('/student', studentRoutes); // Mount student routes under /student prefix

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`Default student pass: ${process.env.DEFAULT_STUDENT_PASSWORD}`); // For testing .env loading
});
