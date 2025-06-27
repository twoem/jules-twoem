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
    viewStudentDetails,
    renderManageStudentEnrollments,
    enrollStudentInCourse,
    removeStudentFromCourse,

    // --- Academic Records Management (by Admin) ---
    renderEnterMarksForm,
    saveMarks,

    // --- Fee Management (by Admin) ---
    renderLogFeeForm,
    saveFeeEntry
};


// --- Fee Management (by Admin) ---

const renderLogFeeForm = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }
        res.render('pages/admin/fees/log', {
            title: `Log Fee for ${student.first_name}`,
            admin: req.admin,
            student,
            description: '', total_amount: '0.00', amount_paid: '0.00',
            payment_date: new Date().toISOString().split('T')[0],
            payment_method: '', notes: ''
        });
    } catch (err) {
        console.error("Error fetching student for fee log form:", err);
        req.flash('error_msg', 'Failed to load fee logging page.');
        res.redirect('/admin/students');
    }
};

const saveFeeEntry = [
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('total_amount').isFloat({ min: 0 }).withMessage('Charge amount must be a valid number (0 or more).'),
    body('amount_paid').isFloat({ min: 0 }).withMessage('Payment amount must be a valid number (0 or more).'),
    body('payment_date').isISO8601().toDate().withMessage('Valid payment date is required.'),
    body('payment_method').trim().optional({ checkFalsy: true }),
    body('notes').trim().optional({ checkFalsy: true }),

    async (req, res) => {
        const studentId = req.params.studentId;
        const errors = validationResult(req);
        const { description, total_amount, amount_paid, payment_date, payment_method, notes } = req.body;

        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }

        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/fees/log', {
                title: `Log Fee for ${student.first_name}`,
                admin: req.admin,
                student,
                errors: errors.array(),
                description, total_amount, amount_paid, payment_date, payment_method, notes
            });
        }

        // Ensure at least one amount is greater than 0 if both are numbers
        const chargeAmount = parseFloat(total_amount);
        const paidAmount = parseFloat(amount_paid);

        if (chargeAmount === 0 && paidAmount === 0) {
             return res.status(400).render('pages/admin/fees/log', {
                title: `Log Fee for ${student.first_name}`,
                admin: req.admin,
                student,
                errors: [{msg: 'Either Charge Amount or Payment Amount must be greater than 0.'}],
                description, total_amount, amount_paid, payment_date, payment_method, notes
            });
        }


        try {
            await db.runAsync(
                `INSERT INTO fees (student_id, description, total_amount, amount_paid, payment_date, payment_method, notes, logged_by_admin_id, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                [studentId, description, chargeAmount, paidAmount, payment_date, payment_method || null, notes || null, req.admin.id]
            );

            logAdminAction(req.admin.id, 'FEE_LOGGED', `Admin ${req.admin.name} logged fee entry for ${student.first_name} (ID: ${studentId}). Desc: ${description}, Charge: ${chargeAmount}, Paid: ${paidAmount}`, 'fee', null, req.ip); // fee ID not easily available here
            req.flash('success_msg', 'Fee entry logged successfully.');
            res.redirect(`/admin/students/${studentId}/fees/log`); // Redirect back to log another, or to student view
            // Or: res.redirect(`/admin/students/view/${studentId}`);
        } catch (err) {
            console.error("Error logging fee entry:", err);
            req.flash('error_msg', 'Failed to log fee entry. ' + err.message);
            res.redirect(`/admin/students/${studentId}/fees/log`);
        }
    }
];

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

        // Fetch enrollments for this student, including course name, marks, and grade
        const enrollments = await db.allAsync(`
            SELECT e.id as enrollment_id, c.name as course_name, e.enrollment_date,
                   e.coursework_marks, e.main_exam_marks, e.final_grade
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = ?
            ORDER BY c.name
        `, [studentId]);

        // Fetch fee details for this student
        const fees = await db.allAsync(`
            SELECT id, description, total_amount, amount_paid, (total_amount - amount_paid) as balance,
                   payment_date, payment_method, notes, logged_by_admin_id, created_at
            FROM fees
            WHERE student_id = ?
            ORDER BY payment_date DESC, created_at DESC
        `, [studentId]);

        let totalCharged = 0;
        let totalPaid = 0;
        fees.forEach(fee => {
            totalCharged += fee.total_amount || 0;
            totalPaid += fee.amount_paid || 0;
        });
        const overallBalance = totalCharged - totalPaid;

        res.render('pages/admin/students/view', {
            title: 'View Student Details',
            admin: req.admin,
            student,
            enrollments: enrollments || [],
            fees: fees || [],
            overallBalance
        });
    } catch (err) {
        console.error("Error fetching student details, enrollments, and fees:", err);
        req.flash('error_msg', 'Failed to load student details.');
        res.redirect('/admin/students');
    }
};

// --- Course Enrollment Management (by Admin) ---

const renderManageStudentEnrollments = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }

        // Get current enrollments with course names
        const currentEnrollments = await db.allAsync(`
            SELECT e.id, e.enrollment_date, e.final_grade, c.name as course_name
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = ?
            ORDER BY c.name
        `, [studentId]);

        // Get courses the student is NOT yet enrolled in
        const availableCourses = await db.allAsync(`
            SELECT id, name
            FROM courses
            WHERE id NOT IN (SELECT course_id FROM enrollments WHERE student_id = ?)
            ORDER BY name
        `, [studentId]);

        res.render('pages/admin/students/enrollments', {
            title: `Manage Enrollments for ${student.first_name}`,
            admin: req.admin,
            student,
            currentEnrollments,
            availableCourses
        });
    } catch (err) {
        console.error("Error fetching data for student enrollments page:", err);
        req.flash('error_msg', 'Failed to load enrollment management page.');
        res.redirect(`/admin/students/view/${studentId}`);
    }
};

const enrollStudentInCourse = async (req, res) => {
    const studentId = req.params.studentId; // From URL
    const { courseId } = req.body; // From form

    if (!courseId) {
        req.flash('error_msg', 'Please select a course to enroll.');
        return res.redirect(`/admin/students/${studentId}/enrollments`);
    }

    try {
        // Check if student and course exist
        const student = await db.getAsync("SELECT id, first_name FROM students WHERE id = ?", [studentId]);
        const course = await db.getAsync("SELECT id, name FROM courses WHERE id = ?", [courseId]);

        if (!student || !course) {
            req.flash('error_msg', 'Student or Course not found.');
            return res.redirect(student ? `/admin/students/${studentId}/enrollments` : '/admin/students');
        }

        // Check if already enrolled (though UI should prevent this, good to double check)
        const existingEnrollment = await db.getAsync(
            "SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?",
            [studentId, courseId]
        );
        if (existingEnrollment) {
            req.flash('error_msg', `Student ${student.first_name} is already enrolled in ${course.name}.`);
            return res.redirect(`/admin/students/${studentId}/enrollments`);
        }

        await db.runAsync(
            "INSERT INTO enrollments (student_id, course_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
            [studentId, courseId]
        );

        logAdminAction(req.admin.id, 'STUDENT_ENROLLED', `Admin ${req.admin.name} enrolled student ${student.first_name} (ID: ${studentId}) in course ${course.name} (ID: ${courseId})`, 'enrollment', null, req.ip); // enrollment ID not easily available here
        req.flash('success_msg', `Student ${student.first_name} successfully enrolled in ${course.name}.`);
        res.redirect(`/admin/students/${studentId}/enrollments`);

    } catch (err) {
        console.error("Error enrolling student in course:", err);
        if (err.message.includes("UNIQUE constraint failed: enrollments.student_id, enrollments.course_id")) {
             req.flash('error_msg', 'Student is already enrolled in this course.');
        } else {
            req.flash('error_msg', 'Failed to enroll student in course. ' + err.message);
        }
        res.redirect(`/admin/students/${studentId}/enrollments`);
    }
};

// --- Academic Records Management (Marks & Grades by Admin) ---

const renderEnterMarksForm = async (req, res) => {
    const enrollmentId = req.params.enrollmentId;
    try {
        const enrollment = await db.getAsync("SELECT * FROM enrollments WHERE id = ?", [enrollmentId]);
        if (!enrollment) {
            req.flash('error_msg', 'Enrollment record not found.');
            return res.redirect('/admin/students'); // Or a more relevant page
        }
        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [enrollment.student_id]);
        const course = await db.getAsync("SELECT id, name FROM courses WHERE id = ?", [enrollment.course_id]);

        if (!student || !course) {
            req.flash('error_msg', 'Student or Course associated with this enrollment not found.');
            return res.redirect('/admin/students');
        }

        res.render('pages/admin/academics/marks', {
            title: `Marks for ${student.first_name} - ${course.name}`,
            admin: req.admin,
            enrollment,
            student,
            course,
            // For pre-filling form if validation fails on POST
            coursework_marks: enrollment.coursework_marks,
            main_exam_marks: enrollment.main_exam_marks,
            // Pass PASSING_GRADE to template for display
            PASSING_GRADE: parseInt(process.env.PASSING_GRADE) || 60
        });

    } catch (err) {
        console.error("Error fetching data for marks entry form:", err);
        req.flash('error_msg', 'Failed to load marks entry page.');
        // Attempt to redirect back to student's enrollments page if student_id is available from enrollment
        // This part might need refinement if enrollment or studentId isn't found/passed.
        const tempEnrollment = await db.getAsync("SELECT student_id FROM enrollments WHERE id = ?", [enrollmentId]).catch(() => null);
        if (tempEnrollment && tempEnrollment.student_id) {
            return res.redirect(`/admin/students/${tempEnrollment.student_id}/enrollments`);
        }
        res.redirect('/admin/students'); // Fallback
    }
};

const saveMarks = [
    // Validation: Ensure marks are numbers and within range (0-100)
    body('coursework_marks').optional({ checkFalsy: true }).isInt({ min: 0, max: 100 }).withMessage('Coursework marks must be between 0 and 100.'),
    body('main_exam_marks').optional({ checkFalsy: true }).isInt({ min: 0, max: 100 }).withMessage('Main exam marks must be between 0 and 100.'),

    async (req, res) => {
        const enrollmentId = req.params.enrollmentId;
        const errors = validationResult(req);

        // Fetch student and course for re-rendering form on error
        let enrollmentForForm, studentForForm, courseForForm;
        try {
            enrollmentForForm = await db.getAsync("SELECT * FROM enrollments WHERE id = ?", [enrollmentId]);
            if (enrollmentForForm) {
                studentForForm = await db.getAsync("SELECT id, first_name FROM students WHERE id = ?", [enrollmentForForm.student_id]);
                courseForForm = await db.getAsync("SELECT id, name FROM courses WHERE id = ?", [enrollmentForForm.course_id]);
            } else {
                req.flash('error_msg', 'Enrollment not found.');
                return res.redirect('/admin/students'); // Or appropriate error handling
            }
        } catch (fetchErr) {
            console.error("Error fetching details for saveMarks error rendering:", fetchErr);
            req.flash('error_msg', 'An error occurred fetching enrollment details.');
            return res.redirect('/admin/students');
        }


        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/academics/marks', {
                title: `Marks for ${studentForForm.first_name} - ${courseForForm.name}`,
                admin: req.admin,
                enrollment: enrollmentForForm, // Pass original enrollment data
                student: studentForForm,
                course: courseForForm,
                errors: errors.array(),
                coursework_marks: req.body.coursework_marks, // Submitted values
                main_exam_marks: req.body.main_exam_marks,
                PASSING_GRADE: parseInt(process.env.PASSING_GRADE) || 60
            });
        }

        const coursework_marks = req.body.coursework_marks ? parseInt(req.body.coursework_marks, 10) : null;
        const main_exam_marks = req.body.main_exam_marks ? parseInt(req.body.main_exam_marks, 10) : null;
        let final_grade = null;

        // Calculate final grade only if both marks are present
        if (coursework_marks !== null && main_exam_marks !== null) {
            const totalScore = (coursework_marks * 0.3) + (main_exam_marks * 0.7);
            const passingGrade = parseInt(process.env.PASSING_GRADE) || 60;
            // Basic Pass/Fail. Could be extended to A, B, C, etc.
            final_grade = totalScore >= passingGrade ? 'Pass' : 'Fail';
        }

        try {
            await db.runAsync(
                `UPDATE enrollments
                 SET coursework_marks = ?, main_exam_marks = ?, final_grade = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [coursework_marks, main_exam_marks, final_grade, enrollmentId]
            );

            logAdminAction(req.admin.id, 'MARKS_UPDATED', `Admin ${req.admin.name} updated marks for enrollment ID: ${enrollmentId}. CW: ${coursework_marks}, Exam: ${main_exam_marks}, Grade: ${final_grade}`, 'enrollment', enrollmentId, req.ip);
            req.flash('success_msg', 'Marks and final grade updated successfully.');
            res.redirect(`/admin/enrollments/${enrollmentId}/marks`); // Redirect back to the same marks page

        } catch (err) {
            console.error("Error saving marks:", err);
            req.flash('error_msg', 'Failed to save marks. ' + err.message);
            res.redirect(`/admin/enrollments/${enrollmentId}/marks`);
        }
    }
];

const removeStudentFromCourse = async (req, res) => {
    const enrollmentId = req.params.enrollmentId;
    const studentId = req.body.studentId; // Passed as hidden field to redirect back correctly

    if (!studentId) {
        req.flash('error_msg', 'Student identifier missing for redirect.');
        return res.redirect('/admin/students'); // Fallback redirect
    }

    try {
        const enrollment = await db.getAsync("SELECT e.id, s.first_name as student_name, c.name as course_name FROM enrollments e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id WHERE e.id = ?", [enrollmentId]);
        if (!enrollment) {
            req.flash('error_msg', 'Enrollment record not found.');
            return res.redirect(`/admin/students/${studentId}/enrollments`);
        }

        // Future check: if marks exist, confirm before unenrolling? Or disallow?
        // For now, direct unenrollment.

        await db.runAsync("DELETE FROM enrollments WHERE id = ?", [enrollmentId]);

        logAdminAction(req.admin.id, 'STUDENT_UNENROLLED', `Admin ${req.admin.name} unenrolled student ${enrollment.student_name} from course ${enrollment.course_name} (Enrollment ID: ${enrollmentId})`, 'enrollment', enrollmentId, req.ip);
        req.flash('success_msg', `Student ${enrollment.student_name} successfully unenrolled from ${enrollment.course_name}.`);
        res.redirect(`/admin/students/${studentId}/enrollments`);

    } catch (err) {
        console.error("Error removing student from course:", err);
        req.flash('error_msg', 'Failed to unenroll student. ' + err.message);
        res.redirect(`/admin/students/${studentId}/enrollments`);
    }
};

// Render edit student form
const renderEditStudentForm = async (req, res) => {
    const studentId = req.params.id;
    try {
        const student = await db.getAsync("SELECT * FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }
        res.render('pages/admin/students/edit', {
            title: 'Edit Student',
            admin: req.admin,
            student,
            errors: [], // For validation errors
            firstName: student.first_name, // For pre-filling form
            email: student.email
        });
    } catch (err) {
        console.error("Error fetching student for edit:", err);
        req.flash('error_msg', 'Failed to load student details for editing.');
        res.redirect('/admin/students');
    }
};

// Handle update student details (excluding password)
const updateStudent = [
    body('firstName').trim().notEmpty().withMessage('First name is required.'),
    body('email').trim().isEmail().withMessage('Valid email is required.'),

    async (req, res) => {
        const studentId = req.params.id;
        const errors = validationResult(req);
        const { firstName, email } = req.body;

        const studentForForm = await db.getAsync("SELECT * FROM students WHERE id = ?", [studentId]);
        if (!studentForForm) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }

        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/students/edit', {
                title: 'Edit Student',
                admin: req.admin,
                errors: errors.array(),
                student: studentForForm, // Pass original student data for other fields
                firstName, email // Pass submitted values back
            });
        }

        try {
            // Check if email is being changed and if the new email already exists for another student
            if (email.toLowerCase() !== studentForForm.email.toLowerCase()) {
                const existingEmailStudent = await db.getAsync("SELECT id FROM students WHERE email = ? AND id != ?", [email.toLowerCase(), studentId]);
                if (existingEmailStudent) {
                    return res.status(400).render('pages/admin/students/edit', {
                        title: 'Edit Student',
                        admin: req.admin,
                        errors: [{ msg: 'This email address is already in use by another student.' }],
                        student: studentForForm,
                        firstName, email
                    });
                }
            }

            await db.runAsync(
                "UPDATE students SET first_name = ?, email = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                [firstName, email.toLowerCase(), studentId]
            );

            logAdminAction(req.admin.id, 'STUDENT_UPDATED', `Admin ${req.admin.name} updated details for student ID: ${studentId}`, 'student', studentId, req.ip);
            req.flash('success_msg', 'Student details updated successfully.');
            res.redirect(`/admin/students/view/${studentId}`);
        } catch (err) {
            console.error("Error updating student:", err);
            req.flash('error_msg', 'Failed to update student details. ' + err.message);
            res.redirect(`/admin/students/edit/${studentId}`);
        }
    }
];

// Toggle student's active status
const toggleStudentStatus = async (req, res) => {
    const studentId = req.params.id;
    try {
        const student = await db.getAsync("SELECT id, first_name, is_active FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }

        const newStatus = !student.is_active;
        await db.runAsync("UPDATE students SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newStatus, studentId]);

        const action = newStatus ? 'ACTIVATED' : 'DEACTIVATED';
        logAdminAction(req.admin.id, `STUDENT_${action}`, `Admin ${req.admin.name} ${action.toLowerCase()} student: ${student.first_name} (ID: ${studentId})`, 'student', studentId, req.ip);
        req.flash('success_msg', `Student account ${student.first_name} has been ${action.toLowerCase()}.`);
        res.redirect(`/admin/students/view/${studentId}`); // Or back to edit page: /admin/students/edit/${studentId}
    } catch (err) {
        console.error("Error toggling student status:", err);
        req.flash('error_msg', 'Failed to update student status. ' + err.message);
        res.redirect('/admin/students');
    }
};
