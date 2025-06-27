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

const renderDownloadsPage = async (req, res) => {
    try {
        const allDocuments = await db.allAsync("SELECT * FROM downloadable_documents ORDER BY type, created_at DESC");

        const publicDocs = [];
        const eulogyDocs = [];
        const now = new Date();

        allDocuments.forEach(doc => {
            if (doc.type === 'public') {
                publicDocs.push(doc);
            } else if (doc.type === 'eulogy') {
                // If no expiry_date, it implies it was never meant to expire or logic error in creation.
                // However, spec says "Eulogy documents (Expire after 7 days)" - this was handled on creation if no date was given.
                // If an expiry_date IS set, we use that.
                // If expiry_date is NULL for a eulogy, we might assume it's an error or apply a default interpretation.
                // The admin form defaults eulogy expiry to 7 days from creation if not set.
                // So, a NULL expiry_date for a eulogy document should ideally not happen with current admin CRUD.
                // We will filter by expiry_date if present and it's in the past.

                let effectiveExpiryDate;
                if (doc.expiry_date) {
                    effectiveExpiryDate = new Date(doc.expiry_date);
                } else {
                    // If no specific expiry_date, default to 7 days from creation for eulogy docs
                    effectiveExpiryDate = new Date(doc.created_at);
                    effectiveExpiryDate.setDate(effectiveExpiryDate.getDate() + 7);
                }

                if (effectiveExpiryDate >= now) {
                    eulogyDocs.push(doc);
                }
            }
        });

        res.render('pages/downloads', {
            title: 'Downloads',
            publicDocs,
            eulogyDocs
        });
    } catch (err) {
        console.error("Error fetching documents for downloads page:", err);
        res.status(500).render('pages/downloads', {
            title: 'Downloads',
            publicDocs: [],
            eulogyDocs: [],
            error_msg: "Could not load documents at this time."
        });
    }
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
