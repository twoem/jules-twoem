// src/controllers/mainController.js
const db = require('../config/database'); // Import database connection

// Renders the home page
const renderHomePage = (req, res) => {
    res.render('pages/home', { title: 'Home' });
};

// Renders the contact page
const renderContactPage = (req, res) => {
    res.render('pages/contact', {
        title: 'Contact Us',
        message: req.query.message, // For success/error messages via query params
        error: req.query.error
    });
};

const { sendEmail } = require('../config/mailer');

// Handles contact form submission
const handleContactForm = async (req, res) => {
    const { name, email: senderEmail, subject: userSubject, message: userMessage } = req.body;

    // Validate inputs (basic example)
    if (!name || !senderEmail || !userSubject || !userMessage) {
        return res.redirect('/contact?error=Please+fill+in+all+fields.');
    }

    const emailHtml = `
        <p>You have a new contact form submission from <strong>${name}</strong> (${senderEmail}).</p>
        <p><strong>Subject:</strong> ${userSubject}</p>
        <p><strong>Message:</strong></p>
        <p>${userMessage.replace(/\n/g, '<br>')}</p>
        <hr>
        <p>This email was sent from the contact form on the Twoem Online Productions website.</p>
    `;

    const emailSubject = `New Contact Form Submission: ${userSubject}`;

    try {
        await sendEmail({
            to: process.env.CONTACT_RECEIVER_EMAIL,
            subject: emailSubject,
            html: emailHtml,
            // As per prompt: "Reply-To automatically set to twoemcyber@gmail.com"
            // and .env has REPLY_TO_EMAIL=twoemcyber@gmail.com
            replyTo: process.env.REPLY_TO_EMAIL
        });

        // The prompt also said: "Auto forwards to twoemcyber@gmail.com".
        // The current setup sends *directly* to twoemcyber@gmail.com.
        // If "auto-forwards" means it should first go to twoem.website@gmail.com and *then* be forwarded,
        // that's a different setup (e.g. Gmail filter rule, or two sendEmail calls).
        // The current implementation sends ONE email FROM twoem.website@gmail.com TO twoemcyber@gmail.com,
        // with REPLY-TO set to twoemcyber@gmail.com. This matches the .env and "Reply-To automatically set to twoemcyber@gmail.com".

        res.redirect('/contact?message=Thank+you+for+your+message!+It+has+been+sent.');
    } catch (error) {
        console.error('Failed to send contact email:', error);
        res.redirect('/contact?error=Sorry,+there+was+an+error+sending+your+message.+Please+try+again+later.');
    }
};

// Renders the admin login page
const renderAdminLoginPage = (req, res) => {
    res.render('pages/admin-login', {
        title: 'Admin Login',
        error: req.query.error // For displaying login errors
    });
};

// Renders the student login page
const renderStudentLoginPage = (req, res) => {
    res.render('pages/student-login', {
        title: 'Student Portal Login',
        message: req.query.message, // For general messages
        error: req.query.error   // For errors
    });
};

const renderServicesPage = (req, res) => {
    try {
        const courses = await db.allAsync("SELECT id, name, description FROM courses ORDER BY name ASC");
        res.render('pages/services', {
            title: 'Our Services',
            courses // Pass courses to the view
        });
    } catch (err) {
        console.error("Error fetching courses for services page:", err);
        // Render services page without courses or with an error message
        res.status(500).render('pages/services', {
            title: 'Our Services',
            courses: [],
            error_msg: "Could not load course information at this time."
        });
    }
};

const renderDownloadsPage = (req, res) => {
    res.render('pages/downloads', { title: 'Downloads' });
};

// Note: Dashboards will likely need auth middleware and data fetching later
const renderStudentDashboardPage = (req, res) => {
    // This will require authentication logic later
    // For now, direct render. Will be moved to a protected route.
    res.render('pages/student-dashboard', { title: 'Student Dashboard' });
};

const renderAdminDashboardPage = (req, res) => {
    // This will require authentication logic later
    // For now, direct render. Will be moved to a protected route.
    res.render('pages/admin-dashboard', { title: 'Admin Dashboard' });
};

const renderDataProtectionPage = (req, res) => {
    res.render('pages/data-protection', { title: 'Data Protection Policy', process }); // Pass process for .env access in EJS if needed
};

const renderGalleryPage = (req, res) => {
    res.render('pages/gallery', { title: 'Gallery' });
};

module.exports = {
    renderHomePage,
    renderContactPage,
    handleContactForm,
    renderAdminLoginPage,
    renderStudentLoginPage,
    renderServicesPage,
    renderDownloadsPage,
    renderStudentDashboardPage,
    renderAdminDashboardPage,
    renderDataProtectionPage,
    renderGalleryPage,
};
