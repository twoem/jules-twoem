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
        req.flash('success_msg', `Student ${firstName} (${email}) registered successfully with Registration Number: ${registrationNumber}.`);
        res.redirect('/admin/register-student'); // Redirect back to the form page (which will show the message)
        // Or redirect to student list: res.redirect('/admin/students');

    } catch (err) {
        console.error("Error registering student:", err);
        req.flash('error_msg', 'An error occurred while registering the student. Please try again.');
        // Redirect back to the form, preserving input is harder with redirects without more complex session state
        // For now, redirect to the GET route which will render a blank form.
        res.redirect('/admin/register-student');
    }
};

const { body, validationResult } = require('express-validator'); // For input validation

// --- Course Management ---

// List all courses
const listCourses = async (req, res) => {
    try {
        const courses = await db.allAsync("SELECT * FROM courses ORDER BY created_at DESC");
        res.render('pages/admin/courses/index', {
            title: 'Manage Courses',
            admin: req.admin,
            courses,
            success_msg: req.flash ? req.flash('success_msg') : null, // Handle if flash not setup
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (err) {
        console.error("Error fetching courses:", err);
        // In a real app, you might redirect to dashboard with a generic error
        res.status(500).send("Error fetching courses. " + err.message);
    }
};

// Render add course form
const renderAddCourseForm = (req, res) => {
    res.render('pages/admin/courses/add', {
        title: 'Add New Course',
        admin: req.admin,
        errors: [], name: '', description: '' // Init for form partial
    });
};

// Handle add new course
const addCourse = [
    // Validation middleware
    body('name').trim().notEmpty().withMessage('Course name is required.')
        .isLength({ min: 3 }).withMessage('Course name must be at least 3 characters long.'),
    body('description').trim().optional({ checkFalsy: true }),

    async (req, res) => {
        const errors = validationResult(req);
        const { name, description } = req.body;

        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/courses/add', {
                title: 'Add New Course',
                admin: req.admin,
                errors: errors.array(),
                name, description
            });
        }

        try {
            const result = await db.runAsync(
                "INSERT INTO courses (name, description, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                [name, description]
            );
            req.flash('success_msg', `Course "${name}" added successfully.`);
            // Log action
            logAdminAction(req.admin.id, 'COURSE_CREATED', `Admin ${req.admin.name} created course: ${name} (ID: ${result.lastID})`, 'course', result.lastID, req.ip);
            res.redirect('/admin/courses');
        } catch (err) {
            console.error("Error adding course:", err);
            // Preserve input by passing it back to the form
            req.flash('error_msg', 'Failed to add course. ' + err.message);
            // This redirect won't preserve req.body.name and req.body.description easily without more setup.
            // For a better UX here, one might store form data in session before redirect, or re-render.
            // Re-rendering is simpler if not strictly following PRG for this error case.
            // For now, we will redirect and lose the input on server error.
            // Validation errors above already handle re-rendering with input.
            res.redirect('/admin/courses/add');
        }
    }
];

// Render edit course form
const renderEditCourseForm = async (req, res) => {
    const courseId = req.params.id;
    try {
        const course = await db.getAsync("SELECT * FROM courses WHERE id = ?", [courseId]);
        if (!course) {
            req.flash('error_msg', 'Course not found.');
            return res.redirect('/admin/courses');
        }
        res.render('pages/admin/courses/edit', {
            title: 'Edit Course',
            admin: req.admin,
            course,
            errors: []
        });
    } catch (err) {
        console.error("Error fetching course for edit:", err);
        // req.flash('error_msg', 'Failed to load course details.');
        res.redirect('/admin/courses');
    }
};

// Handle update course
const updateCourse = [
    body('name').trim().notEmpty().withMessage('Course name is required.')
        .isLength({ min: 3 }).withMessage('Course name must be at least 3 characters long.'),
    body('description').trim().optional({ checkFalsy: true }),

    async (req, res) => {
        const courseId = req.params.id;
        const errors = validationResult(req);
        const { name, description } = req.body;

        if (!errors.isEmpty()) {
            // Need to fetch course again to pass to form if there are validation errors
            const course = await db.getAsync("SELECT * FROM courses WHERE id = ?", [courseId]);
            return res.status(400).render('pages/admin/courses/edit', {
                title: 'Edit Course',
                admin: req.admin,
                errors: errors.array(),
                course: { ...course, name, description } // Show submitted values
            });
        }

        try {
            const result = await db.runAsync(
                "UPDATE courses SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [name, description, courseId]
            );

            if (result.changes === 0) {
                req.flash('error_msg', 'Course not found or no changes made.');
            } else {
                req.flash('success_msg', `Course "${name}" updated successfully.`);
                logAdminAction(req.admin.id, 'COURSE_UPDATED', `Admin ${req.admin.name} updated course: ${name} (ID: ${courseId})`, 'course', courseId, req.ip);
            }
            res.redirect('/admin/courses');
        } catch (err) {
            console.error("Error updating course:", err);
            // For server errors, redirecting and flashing general message
            req.flash('error_msg', 'Failed to update course. ' + err.message);
            res.redirect(`/admin/courses/edit/${courseId}`); // Redirect back to edit form
        }
    }
];

// Handle delete course
const deleteCourse = async (req, res) => {
    const courseId = req.params.id;
    try {
        // Check for enrollments before deleting
        const enrollment = await db.getAsync("SELECT COUNT(id) as count FROM enrollments WHERE course_id = ?", [courseId]);
        if (enrollment && enrollment.count > 0) {
            req.flash('error_msg', `Cannot delete course. It has ${enrollment.count} active student enrollment(s). Please remove enrollments first.`);
            return res.redirect('/admin/courses');
        }

        const result = await db.runAsync("DELETE FROM courses WHERE id = ?", [courseId]);
        if (result.changes === 0) {
            req.flash('error_msg', 'Course not found.');
        } else {
            req.flash('success_msg', 'Course deleted successfully.');
            logAdminAction(req.admin.id, 'COURSE_DELETED', `Admin ${req.admin.name} deleted course ID: ${courseId}`, 'course', courseId, req.ip);
        }
        res.redirect('/admin/courses');
    } catch (err) {
        console.error("Error deleting course:", err);
        req.flash('error_msg', 'Failed to delete course. ' + err.message);
        res.redirect('/admin/courses');
    }
};


// Helper for logging admin actions
async function logAdminAction(admin_id, action_type, description, target_entity_type, target_entity_id, ip_address) {
    try {
        await db.runAsync(
            `INSERT INTO action_logs (admin_id, action_type, description, target_entity_type, target_entity_id, ip_address)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [admin_id, action_type, description, target_entity_type, target_entity_id, ip_address]
        );
    } catch (logErr) {
        console.error("Failed to log admin action:", logErr);
    }
}


module.exports = {
    renderRegisterStudentForm,
    registerStudent,
    listCourses,
    renderAddCourseForm,
    addCourse,
    renderEditCourseForm,
    updateCourse,
    deleteCourse,

    // --- Student Management (by Admin) ---
    listStudents,
    viewStudentDetails
};

// --- Student Management (by Admin) ---

// List all students
const listStudents = async (req, res) => {
    try {
        const students = await db.allAsync("SELECT id, registration_number, first_name, email, created_at, last_login_at FROM students ORDER BY created_at DESC");
        res.render('pages/admin/students/index', {
            title: 'Manage Students',
            admin: req.admin,
            students,
            success_msg: req.flash ? req.flash('success_msg') : null,
            error_msg: req.flash ? req.flash('error_msg') : null
        });
    } catch (err) {
        console.error("Error fetching students:", err);
        res.status(500).render('pages/admin/dashboard', { // Redirect to dashboard or error page
            title: 'Admin Dashboard',
            admin: req.admin,
            error_msg: "Error fetching student list: " + err.message
        });
    }
};

// View a single student's details
const viewStudentDetails = async (req, res) => {
    const studentId = req.params.id;
    try {
        const student = await db.getAsync("SELECT * FROM students WHERE id = ?", [studentId]);
        if (!student) {
            // req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }
        // TODO: Fetch enrollments and fee details for this student later
        res.render('pages/admin/students/view', {
            title: 'View Student Details',
            admin: req.admin,
            student
            // enrollments: [], // Pass actual enrollments later
            // fees: [] // Pass actual fee details later
        });
    } catch (err) {
        console.error("Error fetching student details:", err);
        // req.flash('error_msg', 'Failed to load student details.');
        res.redirect('/admin/students');
    }
};
