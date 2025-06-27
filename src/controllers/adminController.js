const bcrypt = require('bcryptjs');
const db = require('../config/database'); // SQLite database instance
const { randomBytes } = require('crypto');

// Render the student registration form
const renderRegisterStudentForm = (req, res) => {
    res.render('pages/admin/register-student', {
        title: 'Register New Student',
        admin: req.admin, // Pass admin info for layout consistency if needed
        // Pass any form data back in case of validation errors for pre-filling
        firstName: '',
        email: '',
        // errors: [], // Will be populated by validation middleware or logic later
    });
};

// Handle new student registration
const registerStudent = async (req, res) => {
    const { firstName, email } = req.body;
    const admin = req.admin; // Admin performing the action

    // Basic validation (more robust validation can be added using a library like express-validator)
    let errors = [];
    if (!firstName || !email) {
        errors.push({ msg: 'Please fill in all fields.' });
    }
    // Add email format validation if desired

    if (errors.length > 0) {
        return res.status(400).render('pages/admin/register-student', {
            title: 'Register New Student',
            admin,
            errors,
            firstName,
            email
        });
    }

    try {
        // Check if email already exists
        const existingStudent = await db.getAsync("SELECT * FROM students WHERE email = ?", [email]);
        if (existingStudent) {
            errors.push({ msg: 'A student with this email address already exists.' });
            return res.status(400).render('pages/admin/register-student', {
                title: 'Register New Student',
                admin,
                errors,
                firstName,
                email
            });
        }

        // Generate unique registration number: TWOEM<timestamp_hex>
        // Using timestamp and a small random part to reduce collision chance, ensure uniqueness in DB.
        let registrationNumber;
        let isUnique = false;
        while (!isUnique) {
            const timestampPart = Date.now().toString(36).slice(-4).toUpperCase(); // Last 4 chars of base36 timestamp
            const randomPart = randomBytes(2).toString('hex').toUpperCase(); // 4 random hex chars
            registrationNumber = `TWOEM${timestampPart}${randomPart}`;
            const existingReg = await db.getAsync("SELECT id FROM students WHERE registration_number = ?", [registrationNumber]);
            if (!existingReg) {
                isUnique = true;
            }
        }

        // Hash the default password
        const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;
        if (!defaultPassword) {
            console.error("DEFAULT_STUDENT_PASSWORD is not set in .env");
            // This is a server configuration error, should not happen in properly configured env
            return res.status(500).render('pages/admin/register-student', {
                title: 'Register New Student',
                admin,
                error_msg: 'Server configuration error: Default password not set.',
                firstName,
                email
            });
        }
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Insert new student into the database
        const sql = `INSERT INTO students (registration_number, email, first_name, password_hash, requires_password_change, is_profile_complete)
                     VALUES (?, ?, ?, ?, TRUE, FALSE)`;

        const result = await db.runAsync(sql, [registrationNumber, email, firstName, passwordHash]);

        console.log(`Admin ${admin.name} (${admin.email}) registered new student: ${firstName}, ${email}, RegNo: ${registrationNumber}, DB ID: ${result.lastID}`);

        // Store success message in flash or pass via query/render props
        // For simplicity, rendering with a success message directly for now.
        // A redirect with flash message is often better UX.
        req.flash = req.flash || function(type, msg) { // Basic flash mock if not using connect-flash
            if (!this.flashes) this.flashes = {};
            if (!this.flashes[type]) this.flashes[type] = [];
            this.flashes[type].push(msg);
        };
        req.flash('success_msg', `Student ${firstName} (${email}) registered successfully with Registration Number: ${registrationNumber}.`);

        // Instead of rendering, redirect to clear form and prevent re-submission on refresh
        // This requires session middleware and connect-flash for messages to persist across redirect.
        // For now, will re-render with a success message but this is not ideal.
        // Let's simulate a redirect-like experience by clearing form values.
         return res.render('pages/admin/register-student', {
            title: 'Register New Student',
            admin,
            success_msg: `Student ${firstName} (${email}) registered successfully with Registration Number: ${registrationNumber}.`,
            firstName: '', // Clear form
            email: ''      // Clear form
        });

    } catch (err) {
        console.error("Error registering student:", err);
        res.status(500).render('pages/admin/register-student', {
            title: 'Register New Student',
            admin,
            error_msg: 'An error occurred while registering the student. Please try again.',
            firstName,
            email
        });
    }
};

module.exports = {
    renderRegisterStudentForm,
    registerStudent
};
