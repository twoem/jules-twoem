const express = require('express');
const router = express.Router();
const authAdminController = require('../controllers/authAdminController');
const { authAdmin } = require('../middleware/authMiddleware');
const mainController = require('../controllers/mainController'); // To render the login page initially

// GET Admin login page
router.get('/login', (req, res) => {
    // If admin is already logged in (e.g., valid token exists), redirect to dashboard
    // This requires a bit more logic to check token without full authAdmin middleware if it redirects
    // For now, simply render the login page. The authAdmin middleware will protect dashboard.
    if (req.cookies.token) {
        // A token exists, it might be an admin token.
        // A light check could be done here, or just let them see login.
        // If they submit login again, it will re-auth.
        // Or, redirect to dashboard and let authAdmin sort it out.
        // Let's try redirecting to dashboard and let authAdmin handle if it's not valid.
        // This is slightly presumptive but can improve UX.
        // A better check would be to quickly verify the token here if possible without full middleware stack.
        // For simplicity now, we'll just render the login page.
        // The `mainController.renderAdminLoginPage` will be removed later.
    }
    // res.render('pages/admin-login', { title: 'Admin Login', error: req.query.error, message: req.query.message });
    // Using mainController's method for now, will consolidate later if needed or make a specific admin one.
    mainController.renderAdminLoginPage(req, res);
});

// POST Admin login
router.post('/login', authAdminController.loginAdmin);

// GET Admin dashboard (protected)
router.get('/dashboard', authAdmin, (req, res) => {
    res.render('pages/admin-dashboard', {
        title: 'Admin Dashboard',
        admin: req.admin // req.admin is populated by authAdmin middleware
    });
});

// POST Admin logout
router.post('/logout', authAdminController.logoutAdmin);

const adminController = require('../controllers/adminController'); // Import the new admin controller

// Student Management Routes (within Admin)
router.get('/register-student', authAdmin, adminController.renderRegisterStudentForm);
router.post('/register-student', authAdmin, adminController.registerStudent);

// Future admin routes for managing students, courses, etc. will be added here
// Example:
// router.get('/students', authAdmin, adminController.viewStudents); // Assuming viewStudents is in adminController
// router.get('/students/edit/:id', authAdmin, adminController.renderEditStudentForm);
// router.post('/students/edit/:id', authAdmin, adminController.updateStudent);

module.exports = router;
