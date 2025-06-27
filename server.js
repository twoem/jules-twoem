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

// Middleware
app.use(cookieParser()); // Use cookie-parser

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
