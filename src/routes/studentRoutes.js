const express = require('express');
const router = express.Router();
const authStudentController = require('../controllers/authStudentController');
const { authStudent } = require('../middleware/authMiddleware'); // Assuming authStudent is ready

// Note: GET /student/login to display the page is in mainRoutes.js for now.
// This router handles POST /login and subsequent protected student routes.
const mainController = require('../controllers/mainController'); // To render login page

// GET Student login page
router.get('/login', (req, res) => {
    // If student is already logged in, redirect to dashboard
    // This is a simple check, actual auth is on protected routes
    if (req.cookies.token) {
        // Potentially verify token here or just redirect and let authStudent handle it
        // For now, let's make it simple: if token exists, they might be logged in.
        // A more robust check would be to decode token and see if it's a valid student token.
        // However, without specific logic for that here, just rendering login is safer.
        // Or redirect to dashboard and let `authStudent` middleware on dashboard handle it.
    }
    // res.render('pages/student-login', { title: 'Student Portal Login', error: req.query.error, message: req.query.message });
    mainController.renderStudentLoginPage(req, res); // Use mainController's render for now
});

// POST Student login
router.post('/login', authStudentController.loginStudent);

// GET Student dashboard (protected)
router.get('/dashboard', authStudent, (req, res) => {
    // req.student should be populated by authStudent middleware
    res.render('pages/student-dashboard', {
        title: 'Student Dashboard',
        student: req.student
    });
});

// POST Student logout
router.post('/logout', authStudentController.logoutStudent);


// Initial Setup Routes (Force Password Change, Complete Profile)
router.get('/change-password-initial', authStudent, authStudentController.renderChangePasswordInitialForm);
router.post('/change-password-initial', authStudent, authStudentController.handleChangePasswordInitial);

router.get('/complete-profile-initial', authStudent, authStudentController.renderCompleteProfileInitialForm);
router.post('/complete-profile-initial', authStudent, authStudentController.handleCompleteProfileInitial);

// Forgot Password / Reset Password Routes
router.post('/forgot-password', authStudentController.handleForgotPassword); // From student-login.ejs form
router.get('/reset-password-form', authStudentController.renderResetPasswordForm); // Page to enter OTP and new password
router.post('/reset-password', authStudentController.handleResetPassword); // Handles submission from reset-password-form.ejs


module.exports = router;
