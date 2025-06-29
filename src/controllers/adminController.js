const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { randomBytes } = require('crypto');
const { body, validationResult } = require('express-validator');

async function logAdminAction(admin_id, action_type, description, target_entity_type, target_entity_id, ip_address) { /* ... Full function from previous state ... */
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

const renderRegisterStudentForm = (req, res) => {
    res.render('pages/admin/register-student', {
        title: 'Register New Student',
        admin: req.admin,
        firstName: '',
        secondName: '',
        lastName: '',
        email: '',
        phoneNumber: ''
    });
};

const registerStudent = async (req, res) => {
    const { firstName, secondName, lastName, email, phoneNumber } = req.body;
    const admin = req.admin; // Populated by authAdmin middleware
    let errors = [];

    if (!firstName || !lastName || !email) {
        errors.push({ msg: 'Please fill in all required fields (First Name, Last Name, Email).' });
    }
    // Add more specific validation if needed (e.g., email format)

    if (errors.length > 0) {
        return res.status(400).render('pages/admin/register-student', {
            title: 'Register New Student',
            admin,
            errors,
            firstName,
            secondName,
            lastName,
            email,
            phoneNumber
        });
    }

    try {
        const existingStudent = await db.getAsync("SELECT * FROM students WHERE email = ?", [email.toLowerCase()]);
        if (existingStudent) {
            errors.push({ msg: 'A student with this email address already exists.' });
            return res.status(400).render('pages/admin/register-student', {
                title: 'Register New Student', admin, errors, firstName, secondName, lastName, email, phoneNumber
            });
        }

        // Generate new registration number: TWOEMXXX
        let registrationNumber;
        try {
            // Atomically increment and get the new suffix
            // For SQLite, true atomicity without transactions can be tricky.
            // A common approach is to lock or use specific update patterns.
            // Simpler approach for now: get, increment, update. Add unique constraint for safety.
            await db.runAsync("BEGIN TRANSACTION");
            let counter = await db.getAsync("SELECT current_value FROM app_counters WHERE counter_name = 'student_reg_suffix'");
            if (!counter) {
                // This should have been initialized by database.js, but as a fallback:
                await db.runAsync("INSERT INTO app_counters (counter_name, current_value) VALUES ('student_reg_suffix', 0)");
                counter = { current_value: 0 };
            }

            const newSuffix = counter.current_value + 1;
            registrationNumber = `TWOEM${String(newSuffix).padStart(3, '0')}`;

            // Check for uniqueness just in case, though sequential counter should prevent it
            const existingReg = await db.getAsync("SELECT id FROM students WHERE registration_number = ?", [registrationNumber]);
            if (existingReg) {
                await db.runAsync("ROLLBACK"); // Rollback before throwing error
                console.error(`Generated registration number ${registrationNumber} already exists. Counter might be out of sync.`);
                req.flash('error_msg', 'Failed to generate unique registration number. Please try again.');
                return res.status(500).render('pages/admin/register-student', {
                    title: 'Register New Student', admin, errors: [{msg: 'Registration number generation error.'}],
                    firstName, secondName, lastName, email, phoneNumber
                });
            }

            await db.runAsync("UPDATE app_counters SET current_value = ? WHERE counter_name = 'student_reg_suffix'", [newSuffix]);
            await db.runAsync("COMMIT");

        } catch (counterErr) {
            await db.runAsync("ROLLBACK").catch(rbErr => console.error("Rollback error:", rbErr)); // Attempt rollback on error
            console.error("Error generating registration number:", counterErr);
            req.flash('error_msg', 'Error generating registration number.');
            return res.status(500).render('pages/admin/register-student', {
                title: 'Register New Student', admin, errors: [{msg: 'Registration number generation error.'}],
                firstName, secondName, lastName, email, phoneNumber
            });
        }

        const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;
        if (!defaultPassword) {
            console.error("DEFAULT_STUDENT_PASSWORD is not set in .env");
            req.flash('error_msg', 'Server configuration error: Default password not set.');
            return res.redirect('/admin/register-student');
        }
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        const sql = `INSERT INTO students (
                        registration_number, first_name, second_name, last_name, email, phone_number,
                        password_hash, requires_password_change, is_profile_complete, is_active,
                        last_updated_by_admin_id, last_updated_by_admin_name
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, FALSE, TRUE, ?, ?)`;

        const params = [
            registrationNumber, firstName, secondName || null, lastName, email.toLowerCase(), phoneNumber || null,
            passwordHash, admin.id, admin.name
        ];

        const result = await db.runAsync(sql, params);

        const studentFullName = `${firstName} ${secondName ? secondName + ' ' : ''}${lastName}`;
        logAdminAction(req.admin.id, 'STUDENT_REGISTERED', `Admin ${admin.name} registered student: ${studentFullName} (${email}), RegNo: ${registrationNumber}`, 'student', result.lastID, req.ip);
        req.flash('success_msg', `Student ${studentFullName} (${email}) registered successfully with Registration Number: ${registrationNumber}.`);
        res.redirect('/admin/register-student');

    } catch (err) {
        console.error("Error registering student:", err);
        req.flash('error_msg', 'An error occurred while registering the student.');
        res.status(500).render('pages/admin/register-student', {
            title: 'Register New Student', admin,
            errors: [{msg: 'An unexpected error occurred. Please try again.'}],
            firstName, secondName, lastName, email, phoneNumber
        });
    }
};

const listCourses = async (req, res) => {
    try {
        const courses = await db.allAsync("SELECT * FROM courses ORDER BY created_at DESC");
        res.render('pages/admin/courses/index', {
            title: 'Manage Courses', admin: req.admin, courses,
        });
    } catch (err) {
        console.error("Error fetching courses:", err);
        req.flash('error_msg', "Error fetching courses. " + err.message);
        res.redirect('/admin/dashboard');
    }
};
const renderAddCourseForm = (req, res) => { /* ... Full function from previous state ... */
    res.render('pages/admin/courses/add', {
        title: 'Add New Course', admin: req.admin, errors: [], name: '', description: ''
    });
};
const addCourse = [ /* ... Full function from previous state ... */
    body('name').trim().notEmpty().withMessage('Course name is required.').isLength({ min: 3 }).withMessage('Course name must be at least 3 characters long.'),
    body('description').trim().optional({ checkFalsy: true }),
    async (req, res) => {
        const errors = validationResult(req);
        const { name, description } = req.body;
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/courses/add', { title: 'Add New Course', admin: req.admin, errors: errors.array(), name, description });
        }
        try {
            const result = await db.runAsync("INSERT INTO courses (name, description, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [name, description]);
            req.flash('success_msg', `Course "${name}" added successfully.`);
            logAdminAction(req.admin.id, 'COURSE_CREATED', `Admin ${req.admin.name} created course: ${name} (ID: ${result.lastID})`, 'course', result.lastID, req.ip);
            res.redirect('/admin/courses');
        } catch (err) {
            console.error("Error adding course:", err);
            req.flash('error_msg', 'Failed to add course. ' + err.message);
            res.redirect('/admin/courses/add');
        }
    }
];
const renderEditCourseForm = async (req, res) => { /* ... Full function from previous state ... */
    const courseId = req.params.id;
    try {
        const course = await db.getAsync("SELECT * FROM courses WHERE id = ?", [courseId]);
        if (!course) {
            req.flash('error_msg', 'Course not found.');
            return res.redirect('/admin/courses');
        }
        res.render('pages/admin/courses/edit', { title: 'Edit Course', admin: req.admin, course, errors: [] });
    } catch (err) {
        console.error("Error fetching course for edit:", err);
        req.flash('error_msg', 'Failed to load course details for editing.');
        res.redirect('/admin/courses');
    }
};
const updateCourse = [ /* ... Full function from previous state ... */
    body('name').trim().notEmpty().withMessage('Course name is required.').isLength({ min: 3 }).withMessage('Course name must be at least 3 characters long.'),
    body('description').trim().optional({ checkFalsy: true }),
    async (req, res) => {
        const courseId = req.params.id;
        const errors = validationResult(req);
        const { name, description } = req.body;
        if (!errors.isEmpty()) {
            const course = await db.getAsync("SELECT * FROM courses WHERE id = ?", [courseId]);
            return res.status(400).render('pages/admin/courses/edit', { title: 'Edit Course', admin: req.admin, errors: errors.array(), course: { ...course, name, description } });
        }
        try {
            const result = await db.runAsync("UPDATE courses SET name = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [name, description, courseId]);
            if (result.changes === 0) req.flash('error_msg', 'Course not found or no changes made.');
            else {
                req.flash('success_msg', `Course "${name}" updated successfully.`);
                logAdminAction(req.admin.id, 'COURSE_UPDATED', `Admin ${req.admin.name} updated course: ${name} (ID: ${courseId})`, 'course', courseId, req.ip);
            }
            res.redirect('/admin/courses');
        } catch (err) {
            console.error("Error updating course:", err);
            req.flash('error_msg', 'Failed to update course. ' + err.message);
            res.redirect(`/admin/courses/edit/${courseId}`);
        }
    }
];
const deleteCourse = async (req, res) => { /* ... Full function from previous state ... */
    const courseId = req.params.id;
    try {
        const enrollment = await db.getAsync("SELECT COUNT(id) as count FROM enrollments WHERE course_id = ?", [courseId]);
        if (enrollment && enrollment.count > 0) {
            req.flash('error_msg', `Cannot delete course. It has ${enrollment.count} active student enrollment(s). Please remove enrollments first.`);
            return res.redirect('/admin/courses');
        }
        const result = await db.runAsync("DELETE FROM courses WHERE id = ?", [courseId]);
        if (result.changes === 0) req.flash('error_msg', 'Course not found.');
        else {
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
const listStudents = async (req, res) => {
    try {
        const students = await db.allAsync("SELECT id, registration_number, first_name, second_name, last_name, email, created_at, last_login_at, is_active FROM students ORDER BY created_at DESC");
        res.render('pages/admin/students/index', { title: 'Manage Students', admin: req.admin, students });
    } catch (err) {
        console.error("Error fetching students:", err);
        req.flash('error_msg', "Error fetching student list: " + err.message);
        res.redirect('/admin/dashboard');
    }
};
const viewStudentDetails = async (req, res) => { /* ... Full function from previous state ... */
    const studentId = req.params.id;
    try {
        const student = await db.getAsync("SELECT * FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }
        const enrollments = await db.allAsync(`SELECT e.id as enrollment_id, c.name as course_name, e.enrollment_date, e.coursework_marks, e.main_exam_marks, e.final_grade FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = ? ORDER BY c.name`, [studentId]);
        const fees = await db.allAsync(`SELECT id, description, total_amount, amount_paid, (total_amount - amount_paid) as balance, payment_date, payment_method, notes, logged_by_admin_id, created_at FROM fees WHERE student_id = ? ORDER BY payment_date DESC, created_at DESC`, [studentId]);
        let totalCharged = 0; let totalPaid = 0;
        fees.forEach(fee => { totalCharged += fee.total_amount || 0; totalPaid += fee.amount_paid || 0; });
        const overallBalance = totalCharged - totalPaid;
        res.render('pages/admin/students/view', { title: 'View Student Details', admin: req.admin, student, enrollments: enrollments || [], fees: fees || [], overallBalance });
    } catch (err) {
        console.error("Error fetching student details, enrollments, and fees:", err);
        req.flash('error_msg', 'Failed to load student details.');
        res.redirect('/admin/students');
    }
};
const renderEditStudentForm = async (req, res) => { /* ... Full function from previous state ... */
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
            errors: [],
            // Pre-fill form values for potential error re-render using locals if available, else from student object
            firstName: locals.firstName !== undefined ? locals.firstName : student.first_name,
            secondName: locals.secondName !== undefined ? locals.secondName : (student.second_name || ''),
            lastName: locals.lastName !== undefined ? locals.lastName : student.last_name,
            email: locals.email !== undefined ? locals.email : student.email,
            phoneNumber: locals.phoneNumber !== undefined ? locals.phoneNumber : (student.phone_number || '')
        });
    } catch (err) {
        console.error("Error fetching student for edit:", err);
        req.flash('error_msg', 'Failed to load student details for editing.');
        res.redirect('/admin/students');
    }
};
const updateStudent = [
    body('firstName').trim().notEmpty().withMessage('First name is required.'),
    body('lastName').trim().notEmpty().withMessage('Last name is required.'),
    body('email').trim().isEmail().withMessage('Valid email is required.'),
    body('secondName').trim().optional({ checkFalsy: true }),
    body('phoneNumber').trim().optional({ checkFalsy: true }), // Add validation rules for phone if needed e.g. .isMobilePhone()
    async (req, res) => {
        const studentId = req.params.id;
        const errors = validationResult(req);
        const { firstName, secondName, lastName, email, phoneNumber } = req.body;

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
                student: studentForForm, // Pass the original student data for fields not being actively changed
                firstName, secondName, lastName, email, phoneNumber // Pass submitted values back to form
            });
        }
        try {
            // Check if email is being changed and if the new email is already in use by another student
            if (email.toLowerCase() !== studentForForm.email.toLowerCase()) {
                const existingEmailStudent = await db.getAsync("SELECT id FROM students WHERE email = ? AND id != ?", [email.toLowerCase(), studentId]);
                if (existingEmailStudent) {
                     errors.push({ msg: 'This email address is already in use by another student.' });
                     return res.status(400).render('pages/admin/students/edit', {
                        title: 'Edit Student', admin: req.admin, errors: errors.array(), student: studentForForm,
                        firstName, secondName, lastName, email, phoneNumber
                    });
                }
            }

            const studentFullName = `${firstName} ${secondName ? secondName + ' ' : ''}${lastName}`;
            await db.runAsync(
                `UPDATE students SET
                    first_name = ?, second_name = ?, last_name = ?, email = ?, phone_number = ?,
                    updated_at = CURRENT_TIMESTAMP, last_updated_by_admin_id = ?, last_updated_by_admin_name = ?
                 WHERE id = ?`,
                [firstName, secondName || null, lastName, email.toLowerCase(), phoneNumber || null,
                 req.admin.id, req.admin.name, studentId]
            );
            logAdminAction(req.admin.id, 'STUDENT_UPDATED', `Admin ${req.admin.name} updated details for student ${studentFullName} (ID: ${studentId})`, 'student', studentId, req.ip);
            req.flash('success_msg', 'Student details updated successfully.');
            res.redirect(`/admin/students/view/${studentId}`);
        } catch (err) {
            console.error("Error updating student:", err);
            req.flash('error_msg', 'Failed to update student details. ' + err.message);
            res.redirect(`/admin/students/edit/${studentId}`);
        }
    }
];
const toggleStudentStatus = async (req, res) => { /* ... Full function from previous state ... */
    const studentId = req.params.id;
    try {
        const student = await db.getAsync("SELECT id, first_name, is_active FROM students WHERE id = ?", [studentId]);
        if (!student) {
            req.flash('error_msg', 'Student not found.');
            return res.redirect('/admin/students');
        }
        const newStatus = !student.is_active;
        await db.runAsync("UPDATE students SET is_active = ?, updated_at = CURRENT_TIMESTAMP, last_updated_by_admin_id = ?, last_updated_by_admin_name = ? WHERE id = ?", [newStatus, req.admin.id, req.admin.name, studentId]);
        const action = newStatus ? 'ACTIVATED' : 'DEACTIVATED';
        logAdminAction(req.admin.id, `STUDENT_${action}`, `Admin ${req.admin.name} ${action.toLowerCase()} student: ${student.first_name} (ID: ${studentId})`, 'student', studentId, req.ip);
        req.flash('success_msg', `Student account ${student.first_name} has been ${action.toLowerCase()}.`);
        res.redirect(`/admin/students/view/${studentId}`);
    } catch (err) {
        console.error("Error toggling student status:", err);
        req.flash('error_msg', 'Failed to update student status. ' + err.message);
        res.redirect('/admin/students');
    }
};
const renderManageStudentEnrollments = async (req, res) => { /* ... Full function from previous state ... */
    const studentId = req.params.studentId;
    try {
        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [studentId]);
        if (!student) { req.flash('error_msg', 'Student not found.'); return res.redirect('/admin/students'); }
        const currentEnrollments = await db.allAsync(`SELECT e.id, e.enrollment_date, e.final_grade, c.name as course_name FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = ? ORDER BY c.name`, [studentId]);
        const availableCourses = await db.allAsync(`SELECT id, name FROM courses WHERE id NOT IN (SELECT course_id FROM enrollments WHERE student_id = ?) ORDER BY name`, [studentId]);
        res.render('pages/admin/students/enrollments', { title: `Manage Enrollments for ${student.first_name}`, admin: req.admin, student, currentEnrollments, availableCourses });
    } catch (err) {
        console.error("Error fetching data for student enrollments page:", err);
        req.flash('error_msg', 'Failed to load enrollment management page.');
        res.redirect(`/admin/students/view/${studentId}`);
    }
};
const enrollStudentInCourse = async (req, res) => { /* ... Full function from previous state ... */
    const studentId = req.params.studentId;
    const { courseId } = req.body;
    if (!courseId) { req.flash('error_msg', 'Please select a course to enroll.'); return res.redirect(`/admin/students/${studentId}/enrollments`);}
    try {
        const student = await db.getAsync("SELECT id, first_name FROM students WHERE id = ?", [studentId]);
        const course = await db.getAsync("SELECT id, name FROM courses WHERE id = ?", [courseId]);
        if (!student || !course) { req.flash('error_msg', 'Student or Course not found.'); return res.redirect(student ? `/admin/students/${studentId}/enrollments` : '/admin/students'); }
        const existingEnrollment = await db.getAsync("SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?", [studentId, courseId]);
        if (existingEnrollment) { req.flash('error_msg', `Student ${student.first_name} is already enrolled in ${course.name}.`); return res.redirect(`/admin/students/${studentId}/enrollments`); }
        await db.runAsync("INSERT INTO enrollments (student_id, course_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)", [studentId, courseId]);
        logAdminAction(req.admin.id, 'STUDENT_ENROLLED', `Admin ${req.admin.name} enrolled student ${student.first_name} (ID: ${studentId}) in course ${course.name} (ID: ${courseId})`, 'enrollment', null, req.ip);
        req.flash('success_msg', `Student ${student.first_name} successfully enrolled in ${course.name}.`);
        res.redirect(`/admin/students/${studentId}/enrollments`);
    } catch (err) {
        console.error("Error enrolling student in course:", err);
        if (err.message.includes("UNIQUE constraint failed")) req.flash('error_msg', 'Student is already enrolled in this course.');
        else req.flash('error_msg', 'Failed to enroll student in course. ' + err.message);
        res.redirect(`/admin/students/${studentId}/enrollments`);
    }
};
const removeStudentFromCourse = async (req, res) => { /* ... Full function from previous state ... */
    const enrollmentId = req.params.enrollmentId;
    const studentId = req.body.studentId;
    if (!studentId) { req.flash('error_msg', 'Student identifier missing.'); return res.redirect('/admin/students'); }
    try {
        const enrollment = await db.getAsync("SELECT e.id, s.first_name as student_name, c.name as course_name FROM enrollments e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id WHERE e.id = ?", [enrollmentId]);
        if (!enrollment) { req.flash('error_msg', 'Enrollment record not found.'); return res.redirect(`/admin/students/${studentId}/enrollments`); }
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
const renderEnterMarksForm = async (req, res) => { /* ... Full function from previous state ... */
    const enrollmentId = req.params.enrollmentId;
    try {
        const enrollment = await db.getAsync("SELECT * FROM enrollments WHERE id = ?", [enrollmentId]);
        if (!enrollment) {
            req.flash('error_msg', 'Enrollment record not found.');
            return res.redirect('/admin/students');
        }

        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [enrollment.student_id]);
        const course = await db.getAsync("SELECT id, name FROM courses WHERE id = ?", [enrollment.course_id]);

        if (!student || !course) {
            req.flash('error_msg', 'Student or Course for enrollment not found.');
            return res.redirect('/admin/students');
        }

        // Fetch all units for this course
        const units = await db.allAsync("SELECT id, unit_name FROM units WHERE course_id = ? ORDER BY id", [course.id]);

        // Fetch existing unit marks for this enrollment
        const existingUnitMarksData = await db.allAsync(
            "SELECT unit_id, marks FROM student_unit_marks WHERE enrollment_id = ?", [enrollmentId]
        );
        const unitMarksMap = new Map();
        existingUnitMarksData.forEach(um => {
            unitMarksMap.set(um.unit_id, um.marks);
        });

        // Prepare units with their marks for the form
        const unitsForForm = units.map(unit => ({
            ...unit,
            marks: unitMarksMap.get(unit.id) // Will be undefined if no mark yet
        }));

        res.render('pages/admin/academics/marks', {
            title: `Marks for ${student.first_name} - ${course.name}`,
            admin: req.admin,
            enrollment, // Contains new fields like average_unit_marks, main_exam_theory_marks etc.
            student,
            course,
            units: unitsForForm, // Pass units with their marks
            main_exam_theory_marks: enrollment.main_exam_theory_marks, // Use new field name
            main_exam_practical_marks: enrollment.main_exam_practical_marks, // Use new field name
            PASSING_GRADE: parseInt(process.env.PASSING_GRADE) || 60
        });

    } catch (err) {
        console.error("Error fetching data for marks entry form:", err);
        req.flash('error_msg', 'Failed to load marks entry page. ' + err.message);
        const tempEnrollment = await db.getAsync("SELECT student_id FROM enrollments WHERE id = ?", [enrollmentId]).catch(() => null);
        if (tempEnrollment && tempEnrollment.student_id) return res.redirect(`/admin/students/${tempEnrollment.student_id}/enrollments`);
        res.redirect('/admin/students');
    }
};

// Validation for the new structure
const saveAcademicMarksValidation = [
    body('main_exam_theory_marks').optional({ checkFalsy: true }).isInt({ min: 0, max: 100 }).withMessage('Main exam theory marks must be between 0 and 100, or empty.'),
    body('main_exam_practical_marks').optional({ checkFalsy: true }).isInt({ min: 0, max: 100 }).withMessage('Main exam practical marks must be between 0 and 100, or empty.')
    // Unit marks will be validated inside the controller due to dynamic keys
];

const saveAcademicMarks = async (req, res) => {
    const enrollmentId = req.params.enrollmentId;
    const adminId = req.admin.id;
    const adminName = req.admin.name;

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        req.flash('error_msg', errors.array().map(e => e.msg).join(', '));
        // Re-rendering form with errors and values requires fetching all data again, similar to renderEnterMarksForm
        // For now, simple redirect. A more robust solution would re-render.
        return res.redirect(`/admin/enrollments/${enrollmentId}/marks`);
    }

    const { unit_marks, main_exam_theory_marks, main_exam_practical_marks } = req.body;

    try {
        await db.runAsync("BEGIN TRANSACTION");

        let unitMarksForLog = []; // For logging purposes

        // 1. Save/Update Unit Marks
        if (unit_marks && typeof unit_marks === 'object') {
            for (const unitIdStr in unit_marks) {
                const unitId = parseInt(unitIdStr, 10);
                const markStr = unit_marks[unitIdStr];

                if (markStr === '' || markStr === null || markStr === undefined) {
                    await db.runAsync(
                        `DELETE FROM student_unit_marks WHERE enrollment_id = ? AND unit_id = ?`,
                        [enrollmentId, unitId]
                    );
                    unitMarksForLog.push(`Unit ${unitId}: cleared`);
                } else {
                    const mark = parseInt(markStr, 10);
                    if (isNaN(mark) || mark < 0 || mark > 100) {
                        await db.runAsync("ROLLBACK");
                        req.flash('error_msg', `Invalid mark for unit ID ${unitId}: '${markStr}'. Must be 0-100 or empty.`);
                        return res.redirect(`/admin/enrollments/${enrollmentId}/marks`);
                    }
                    await db.runAsync(
                        `INSERT INTO student_unit_marks (enrollment_id, unit_id, marks, logged_by_admin_id, logged_by_admin_name, updated_at)
                         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                         ON CONFLICT(enrollment_id, unit_id) DO UPDATE SET
                         marks = excluded.marks, logged_by_admin_id = excluded.logged_by_admin_id, logged_by_admin_name = excluded.logged_by_admin_name, updated_at = CURRENT_TIMESTAMP`,
                        [enrollmentId, unitId, mark, adminId, adminName]
                    );
                    unitMarksForLog.push(`Unit ${unitId}: ${mark}`);
                }
            }
        }

        // 2. Calculate Average Unit Marks
        // Fetch all units for the course (assuming course_id 1 for "Basic Computer Training")
        // This assumes enrollment.course_id is correctly set, ideally to 1.
        const currentEnrollment = await db.getAsync("SELECT course_id FROM enrollments WHERE id = ?", [enrollmentId]);
        if (!currentEnrollment) throw new Error("Enrollment not found during mark saving.");

        const allCourseUnits = await db.allAsync("SELECT id FROM units WHERE course_id = ?", [currentEnrollment.course_id]);
        const totalUnitsExpected = allCourseUnits.length; // Should be 8 for the main course

        const allUnitMarksRecords = await db.allAsync("SELECT unit_id, marks FROM student_unit_marks WHERE enrollment_id = ?", [enrollmentId]);
        let averageUnitMarks = null;
        let allUnitsMarked = false;

        if (allUnitMarksRecords.length > 0) {
            const sumOfMarks = allUnitMarksRecords.reduce((sum, record) => sum + (record.marks || 0), 0);
            // Check if all *expected* units for the course have a mark submitted
            const markedUnitIds = new Set(allUnitMarksRecords.map(r => r.unit_id));
            allUnitsMarked = allCourseUnits.every(u => markedUnitIds.has(u.id) && allUnitMarksRecords.find(r => r.unit_id === u.id && r.marks !== null) );

            if (allUnitsMarked) { // Calculate average only if all expected units are marked
                averageUnitMarks = sumOfMarks / totalUnitsExpected;
            } else {
                // If not all units are marked, average_unit_marks remains null or based on partial,
                // but final grade cannot be computed. Let's set to null if not all marked.
                averageUnitMarks = null;
            }
        }


        // 3. Prepare Exam Marks (allow null if empty string)
        const theoryMarksRaw = main_exam_theory_marks;
        const practicalMarksRaw = main_exam_practical_marks;

        const theoryMarks = (theoryMarksRaw !== '' && theoryMarksRaw !== null && theoryMarksRaw !== undefined)
                            ? parseInt(theoryMarksRaw, 10) : null;
        const practicalMarks = (practicalMarksRaw !== '' && practicalMarksRaw !== null && practicalMarksRaw !== undefined)
                             ? parseInt(practicalMarksRaw, 10) : null;

        if ((theoryMarks !== null && (isNaN(theoryMarks) || theoryMarks < 0 || theoryMarks > 100)) ||
            (practicalMarks !== null && (isNaN(practicalMarks) || practicalMarks < 0 || practicalMarks > 100))) {
            await db.runAsync("ROLLBACK");
            req.flash('error_msg', "Invalid exam marks. Must be 0-100 or empty.");
            return res.redirect(`/admin/enrollments/${enrollmentId}/marks`);
        }

        // 4. Calculate Total Score and Final Grade
        let totalScore = null;
        let finalGrade = null;

        if (allUnitsMarked && averageUnitMarks !== null && theoryMarks !== null && practicalMarks !== null) {
            totalScore = (averageUnitMarks * 0.30) + (theoryMarks * 0.35) + (practicalMarks * 0.35);
            const passingGradeEnv = parseInt(process.env.PASSING_GRADE, 10) || 60;
            finalGrade = totalScore >= passingGradeEnv ? 'Pass' : 'Fail';
        }

        // 5. Update Enrollments Table
        await db.runAsync(
            `UPDATE enrollments SET
                average_unit_marks = ?,
                main_exam_theory_marks = ?,
                main_exam_practical_marks = ?,
                final_grade = ?,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [averageUnitMarks, theoryMarks, practicalMarks, finalGrade, enrollmentId]
        );

        await db.runAsync("COMMIT");

        const logMessage = `Admin ${adminName} updated marks for enrollment ID: ${enrollmentId}. Units: [${unitMarksForLog.join(', ')}]. Theory: ${theoryMarks}, Practical: ${practicalMarks}, AvgUnit: ${averageUnitMarks}, Final Grade: ${finalGrade}`;
        logAdminAction(adminId, 'ACADEMIC_MARKS_UPDATED', logMessage, 'enrollment', enrollmentId, req.ip);
        req.flash('success_msg', 'Academic marks updated successfully.');
        res.redirect(`/admin/enrollments/${enrollmentId}/marks`);

    } catch (err) {
        await db.runAsync("ROLLBACK").catch(rbErr => console.error("Rollback error on saveAcademicMarks:", rbErr));
        console.error("Error saving academic marks:", err);
        req.flash('error_msg', 'Failed to save academic marks. ' + err.message);
        res.redirect(`/admin/enrollments/${enrollmentId}/marks`);
    }
};

const renderLogFeeForm = async (req, res) => {
    const studentId = req.params.studentId;
    try {
        const student = await db.getAsync("SELECT id, first_name, registration_number FROM students WHERE id = ?", [studentId]);
        if (!student) { req.flash('error_msg', 'Student not found.'); return res.redirect('/admin/students'); }
        res.render('pages/admin/fees/log', { title: `Log Fee for ${student.first_name}`, admin: req.admin, student, description: '', total_amount: '0.00', amount_paid: '0.00', payment_date: new Date().toISOString().split('T')[0], payment_method: '', notes: '' });
    } catch (err) {
        console.error("Error fetching student for fee log form:", err);
        req.flash('error_msg', 'Failed to load fee logging page.');
        res.redirect('/admin/students');
    }
};
const saveFeeEntry = [ /* ... Existing ... */
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
        const student = await db.getAsync("SELECT id, first_name FROM students WHERE id = ?", [studentId]);
        if (!student) { req.flash('error_msg', 'Student not found.'); return res.redirect('/admin/students'); }
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/fees/log', { title: `Log Fee for ${student.first_name}`, admin: req.admin, student, errors: errors.array(), description, total_amount, amount_paid, payment_date, payment_method, notes });
        }
        const chargeAmount = parseFloat(total_amount); const paidAmount = parseFloat(amount_paid);
        if (chargeAmount === 0 && paidAmount === 0) {
             return res.status(400).render('pages/admin/fees/log', { title: `Log Fee for ${student.first_name}`, admin: req.admin, student, errors: [{msg: 'Either Charge Amount or Payment Amount must be greater than 0.'}], description, total_amount, amount_paid, payment_date, payment_method, notes });
        }
        try {
            await db.runAsync(`INSERT INTO fees (student_id, description, total_amount, amount_paid, payment_date, payment_method, notes, logged_by_admin_id, logged_by_admin_name, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [studentId, description, chargeAmount, paidAmount, payment_date, payment_method || null, notes || null, req.admin.id, req.admin.name]);
            logAdminAction(req.admin.id, 'FEE_LOGGED', `Admin ${req.admin.name} logged fee entry for ${student.first_name} (ID: ${studentId}). Desc: ${description}, Charge: ${chargeAmount}, Paid: ${paidAmount}`, 'fee', null, req.ip);
            req.flash('success_msg', 'Fee entry logged successfully.');
            res.redirect(`/admin/students/${studentId}/fees/log`);
        } catch (err) {
            console.error("Error logging fee entry:", err);
            req.flash('error_msg', 'Failed to log fee entry. ' + err.message);
            res.redirect(`/admin/students/${studentId}/fees/log`);
        }
    }
];
const listNotifications = async (req, res) => { /* ... Existing ... */
    try {
        const notifications = await db.allAsync("SELECT * FROM notifications ORDER BY created_at DESC");
        res.render('pages/admin/notifications/index', {
            title: 'Manage Notifications', admin: req.admin, notifications
        });
    } catch (err) {
        console.error("Error fetching notifications:", err);
        req.flash('error_msg', 'Failed to load notifications.');
        res.redirect('/admin/dashboard');
    }
};
const renderCreateNotificationForm = async (req, res) => { /* ... Existing ... */
    let students = [], courses = [];
    try {
        students = await db.allAsync("SELECT id, first_name, registration_number FROM students WHERE is_active = TRUE ORDER BY first_name");
        courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name");
    } catch (err) { console.error("Error fetching students/courses for notification form:", err); }
    res.render('pages/admin/notifications/form', {
        title: 'Create Notification', admin: req.admin, errors: [],
        title_val: '', message_val: '', target_audience_type: 'all',
        students, courses,
        target_audience_identifier_student: '', target_audience_identifier_course: ''
    });
};
const createNotification = [ /* ... Existing ... */
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('message').trim().notEmpty().withMessage('Message is required.'),
    body('target_audience_type').isIn(['all', 'student_id', 'course_id']).withMessage('Invalid target audience type.'),
    body('target_audience_identifier_student').if(body('target_audience_type').equals('student_id')).notEmpty().withMessage('Student selection is required.').isNumeric().withMessage('Student ID must be numeric.'),
    body('target_audience_identifier_course').if(body('target_audience_type').equals('course_id')).notEmpty().withMessage('Course selection is required.').isNumeric().withMessage('Course ID must be numeric.'),
    async (req, res) => {
        const errors = validationResult(req);
        const { title, message, target_audience_type, target_audience_identifier_student, target_audience_identifier_course } = req.body;
        let finalTargetIdentifier = null;
        if (target_audience_type === 'student_id') finalTargetIdentifier = target_audience_identifier_student;
        else if (target_audience_type === 'course_id') finalTargetIdentifier = target_audience_identifier_course;

        if (!errors.isEmpty()) {
            let students = [], courses = []; try { students = await db.allAsync("SELECT id, first_name, registration_number FROM students WHERE is_active = TRUE ORDER BY first_name"); courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name"); } catch (err) { console.error("Error fetching for error render:", err); }
            return res.status(400).render('pages/admin/notifications/form', { title: 'Create Notification', admin: req.admin, errors: errors.array(), title_val: title, message_val: message, target_audience_type, target_audience_identifier: finalTargetIdentifier, students, courses, target_audience_identifier_student, target_audience_identifier_course });
        }
        try {
            if (target_audience_type === 'student_id' && finalTargetIdentifier) { const studentExists = await db.getAsync("SELECT id FROM students WHERE id = ?", [finalTargetIdentifier]); if (!studentExists) throw new Error(`Student with ID ${finalTargetIdentifier} not found.`); }
            if (target_audience_type === 'course_id' && finalTargetIdentifier) { const courseExists = await db.getAsync("SELECT id FROM courses WHERE id = ?", [finalTargetIdentifier]); if (!courseExists) throw new Error(`Course with ID ${finalTargetIdentifier} not found.`); }
            const result = await db.runAsync( `INSERT INTO notifications (title, message, target_audience_type, target_audience_identifier, created_by_admin_id) VALUES (?, ?, ?, ?, ?)`, [title, message, target_audience_type, (target_audience_type === 'all' ? null : finalTargetIdentifier), req.admin.id] );
            logAdminAction(req.admin.id, 'NOTIFICATION_CREATED', `Admin ${req.admin.name} created notification: ${title}`, 'notification', result.lastID, req.ip);
            req.flash('success_msg', 'Notification created successfully.');
            res.redirect('/admin/notifications');
        } catch (err) {
            console.error("Error creating notification:", err); req.flash('error_msg', 'Failed to create notification. ' + err.message);
            let students = [], courses = []; try { students = await db.allAsync("SELECT id, first_name, registration_number FROM students WHERE is_active = TRUE ORDER BY first_name"); courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name"); } catch (fetchErr) { console.error("Error fetching for error render:", fetchErr); }
            res.status(500).render('pages/admin/notifications/form', { title: 'Create Notification', admin: req.admin, errors: [{ msg: err.message }], title_val: title, message_val: message, target_audience_type, target_audience_identifier: finalTargetIdentifier, students, courses, target_audience_identifier_student, target_audience_identifier_course });
        }
    }
];
const deleteNotification = async (req, res) => { /* ... Existing ... */
    const notificationId = req.params.id;
    try {
        const result = await db.runAsync("DELETE FROM notifications WHERE id = ?", [notificationId]);
        if (result.changes === 0) req.flash('error_msg', 'Notification not found.');
        else {
            req.flash('success_msg', 'Notification deleted successfully.');
            logAdminAction(req.admin.id, 'NOTIFICATION_DELETED', `Admin ${req.admin.name} deleted notification ID: ${notificationId}`, 'notification', notificationId, req.ip);
        }
        res.redirect('/admin/notifications');
    } catch (err) {
        console.error("Error deleting notification:", err);
        req.flash('error_msg', 'Failed to delete notification. ' + err.message);
        res.redirect('/admin/notifications');
    }
};
const listResources = async (req, res) => { /* ... Existing ... */
    try {
        const resources = await db.allAsync(`
            SELECT sr.*, c.name as course_name
            FROM study_resources sr
            LEFT JOIN courses c ON sr.course_id = c.id
            ORDER BY sr.created_at DESC
        `);
        res.render('pages/admin/resources/index', {
            title: 'Manage Study Resources', admin: req.admin, resources
        });
    } catch (err) {
        console.error("Error fetching study resources:", err);
        req.flash('error_msg', 'Failed to load study resources.');
        res.redirect('/admin/dashboard');
    }
};
const renderCreateResourceForm = async (req, res) => { /* ... Existing ... */
    try {
        const courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name");
        res.render('pages/admin/resources/add', {
            title: 'Add Study Resource', admin: req.admin, courses,
            errors: [], title_val: '', description_val: '', resource_url_val: '', course_id_val: null
        });
    } catch (err) {
        console.error("Error fetching courses for resource form:", err);
        req.flash('error_msg', 'Failed to load resource form.');
        res.redirect('/admin/study-resources');
    }
};
const createResource = [ /* ... Existing ... */
    body('title').trim().notEmpty().withMessage('Resource title is required.'),
    body('resource_url').trim().notEmpty().withMessage('Resource URL is required.').isURL().withMessage('Must be a valid URL.'),
    body('description').trim().optional({ checkFalsy: true }),
    body('course_id').trim().optional({ checkFalsy: true }).isInt().withMessage('Invalid course selection.'),
    async (req, res) => {
        const errors = validationResult(req);
        const { title, description, resource_url, course_id } = req.body;
        if (!errors.isEmpty()) {
            const courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name").catch(() => []);
            return res.status(400).render('pages/admin/resources/add', {
                title: 'Add Study Resource', admin: req.admin, courses, errors: errors.array(),
                title_val: title, description_val: description, resource_url_val: resource_url, course_id_val: course_id
            });
        }
        try {
            const finalCourseId = course_id ? parseInt(course_id, 10) : null;
            if (finalCourseId) {
                const courseExists = await db.getAsync("SELECT id FROM courses WHERE id = ?", [finalCourseId]);
                if (!courseExists) throw new Error('Selected course not found.');
            }
            const result = await db.runAsync( `INSERT INTO study_resources (title, description, resource_url, course_id, uploaded_by_admin_id, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [title, description, resource_url, finalCourseId, req.admin.id] );
            logAdminAction(req.admin.id, 'RESOURCE_CREATED', `Admin ${req.admin.name} created study resource: ${title}`, 'study_resource', result.lastID, req.ip);
            req.flash('success_msg', 'Study resource added successfully.');
            res.redirect('/admin/study-resources');
        } catch (err) {
            console.error("Error adding study resource:", err);
            req.flash('error_msg', 'Failed to add study resource. ' + err.message);
            const courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name").catch(() => []);
            res.status(500).render('pages/admin/resources/add', {
                title: 'Add Study Resource', admin: req.admin, courses,
                errors: [{msg: 'Failed to add study resource. ' + err.message}],
                title_val: title, description_val: description, resource_url_val: resource_url, course_id_val: course_id
            });
        }
    }
];
const renderEditResourceForm = async (req, res) => { /* ... Existing ... */
    const resourceId = req.params.id;
    try {
        const resource = await db.getAsync("SELECT * FROM study_resources WHERE id = ?", [resourceId]);
        if (!resource) {
            req.flash('error_msg', 'Study resource not found.');
            return res.redirect('/admin/study-resources');
        }
        const courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name");
        res.render('pages/admin/resources/edit', {
            title: 'Edit Study Resource', admin: req.admin, resource, courses, errors: []
        });
    } catch (err) {
        console.error("Error fetching resource for edit:", err);
        req.flash('error_msg', 'Failed to load resource details for editing.');
        res.redirect('/admin/study-resources');
    }
};
const updateResource = [ /* ... Existing ... */
    body('title').trim().notEmpty().withMessage('Resource title is required.'),
    body('resource_url').trim().notEmpty().withMessage('Resource URL is required.').isURL().withMessage('Must be a valid URL.'),
    body('description').trim().optional({ checkFalsy: true }),
    body('course_id').trim().optional({ checkFalsy: true }).isInt().withMessage('Invalid course selection.'),
    async (req, res) => {
        const resourceId = req.params.id;
        const errors = validationResult(req);
        const { title, description, resource_url, course_id } = req.body;
        if (!errors.isEmpty()) {
            const resource = await db.getAsync("SELECT * FROM study_resources WHERE id = ?", [resourceId]).catch(() => null);
            const courses = await db.allAsync("SELECT id, name FROM courses ORDER BY name").catch(() => []);
            return res.status(400).render('pages/admin/resources/edit', {
                title: 'Edit Study Resource', admin: req.admin,
                resource: resource ? {...resource, title, description, resource_url, course_id } : {id: resourceId},
                courses, errors: errors.array(),
            });
        }
        try {
            const finalCourseId = course_id ? parseInt(course_id, 10) : null;
             if (finalCourseId) {
                const courseExists = await db.getAsync("SELECT id FROM courses WHERE id = ?", [finalCourseId]);
                if (!courseExists) throw new Error('Selected course not found.');
            }
            const result = await db.runAsync( `UPDATE study_resources SET title = ?, description = ?, resource_url = ?, course_id = ?, uploaded_by_admin_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [title, description, resource_url, finalCourseId, req.admin.id, resourceId] );
            if (result.changes === 0) {
                req.flash('error_msg', 'Study resource not found or no changes made.');
            } else {
                logAdminAction(req.admin.id, 'RESOURCE_UPDATED', `Admin ${req.admin.name} updated study resource: ${title}`, 'study_resource', resourceId, req.ip);
                req.flash('success_msg', 'Study resource updated successfully.');
            }
            res.redirect('/admin/study-resources');
        } catch (err) {
            console.error("Error updating study resource:", err);
            req.flash('error_msg', 'Failed to update study resource. ' + err.message);
            res.redirect(`/admin/study-resources/edit/${resourceId}`);
        }
    }
];
const deleteResource = async (req, res) => { /* ... Existing ... */
    const resourceId = req.params.id;
    try {
        const result = await db.runAsync("DELETE FROM study_resources WHERE id = ?", [resourceId]);
        if (result.changes === 0) {
            req.flash('error_msg', 'Study resource not found.');
        } else {
            logAdminAction(req.admin.id, 'RESOURCE_DELETED', `Admin ${req.admin.name} deleted study resource ID: ${resourceId}`, 'study_resource', resourceId, req.ip);
            req.flash('success_msg', 'Study resource deleted successfully.');
        }
        res.redirect('/admin/study-resources');
    } catch (err) {
        console.error("Error deleting study resource:", err);
        req.flash('error_msg', 'Failed to delete study resource. ' + err.message);
        res.redirect('/admin/study-resources');
    }
};
const renderWifiSettingsForm = async (req, res) => { /* ... Existing ... */
    try {
        const settingKeys = ['wifi_ssid', 'wifi_password_plaintext', 'wifi_disclaimer'];
        const settingsData = await db.allAsync("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?,?,?)", settingKeys);
        const settings = {};
        settingsData.forEach(row => { settings[row.setting_key] = row.setting_value; });
        res.render('pages/admin/settings/wifi', { title: 'WiFi Settings Management', admin: req.admin, settings, errors: [] });
    } catch (err) {
        console.error("Error fetching wifi settings:", err);
        req.flash('error_msg', 'Failed to load WiFi settings.');
        res.redirect('/admin/dashboard');
    }
};
const updateWifiSettings = [ /* ... Existing ... */
    body('wifi_ssid').trim().notEmpty().withMessage('WiFi SSID is required.'),
    body('wifi_password').trim().optional({checkFalsy: true}).isLength({min:8}).withMessage('New WiFi password must be at least 8 characters if provided.'),
    body('wifi_disclaimer').trim().optional({checkFalsy: true}),
    async (req, res) => {
        const errors = validationResult(req);
        const { wifi_ssid, wifi_password, wifi_disclaimer } = req.body;
        if (!errors.isEmpty()) {
            const settingKeys = ['wifi_ssid', 'wifi_password_plaintext', 'wifi_disclaimer'];
            const settingsData = await db.allAsync("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?,?,?)", settingKeys).catch(() => []);
            const currentSettings = {};
            settingsData.forEach(row => { currentSettings[row.setting_key] = row.setting_value; });
            return res.status(400).render('pages/admin/settings/wifi', { title: 'WiFi Settings Management', admin: req.admin, settings: { wifi_ssid, wifi_disclaimer }, errors: errors.array() });
        }
        try {
            const upsertSetting = (key, value, desc, adminId) => db.runAsync( `INSERT INTO site_settings (setting_key, setting_value, description, updated_by_admin_id, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by_admin_id = excluded.updated_by_admin_id, updated_at = CURRENT_TIMESTAMP`, [key, value, desc, adminId] );
            const updates = [];
            let updatedSettingsForLog = [];
            updates.push(upsertSetting('wifi_ssid', wifi_ssid, 'WiFi Network Name (SSID)', req.admin.id));
            updatedSettingsForLog.push('SSID');
            if (wifi_password) {
                updates.push(upsertSetting('wifi_password_plaintext', wifi_password, 'Plaintext WiFi Password (for student view)', req.admin.id));
                updatedSettingsForLog.push('Password');
            }
            updates.push(upsertSetting('wifi_disclaimer', wifi_disclaimer || '', 'WiFi Usage Disclaimer', req.admin.id));
            if (wifi_disclaimer || wifi_disclaimer === '') updatedSettingsForLog.push('Disclaimer');
            await Promise.all(updates);
            logAdminAction(req.admin.id, 'WIFI_SETTINGS_UPDATED', `Admin ${req.admin.name} updated WiFi settings: ${updatedSettingsForLog.join(', ')}`, 'site_settings', null, req.ip);
            req.flash('success_msg', 'WiFi settings updated successfully.');
            res.redirect('/admin/settings/wifi');
        } catch (err) {
            console.error("Error updating WiFi settings:", err);
            req.flash('error_msg', 'Failed to update WiFi settings. ' + err.message);
            res.redirect('/admin/settings/wifi');
        }
    }
];
const listDownloadableDocuments = async (req, res) => { /* ... Existing ... */
    try {
        const documents = await db.allAsync("SELECT * FROM downloadable_documents ORDER BY created_at DESC");
        res.render('pages/admin/documents/index', {
            title: 'Manage Downloadable Documents', admin: req.admin, documents
        });
    } catch (err) {
        console.error("Error fetching downloadable documents:", err);
        req.flash('error_msg', 'Failed to load document list.');
        res.redirect('/admin/dashboard');
    }
};
const renderCreateDocumentForm = (req, res) => { /* ... Existing ... */
    res.render('pages/admin/documents/add', {
        title: 'Add Downloadable Document', admin: req.admin, errors: [],
        title_val: '', description_val: '', file_url_val: '', type_val: 'public', expiry_date_val: ''
    });
};
const createDocument = [ /* ... Existing ... */
    body('title').trim().notEmpty().withMessage('Document title is required.'),
    body('file_url').trim().notEmpty().withMessage('File URL is required.').isURL().withMessage('Must be a valid URL.'),
    body('type').isIn(['public', 'eulogy']).withMessage('Invalid document type.'),
    body('description').trim().optional({ checkFalsy: true }),
    body('expiry_date').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid expiry date format.'),
    async (req, res) => {
        const errors = validationResult(req);
        let { title, description, file_url, type, expiry_date } = req.body;
        if (!errors.isEmpty()) {
            return res.status(400).render('pages/admin/documents/add', { title: 'Add Downloadable Document', admin: req.admin, errors: errors.array(), title_val: title, description_val: description, file_url_val: file_url, type_val: type, expiry_date_val: expiry_date });
        }
        if (type === 'public') expiry_date = null;
        else if (type === 'eulogy' && !expiry_date) { let defaultExpiry = new Date(); defaultExpiry.setDate(defaultExpiry.getDate() + 7); expiry_date = defaultExpiry.toISOString().split('T')[0]; }
        try {
            const result = await db.runAsync( `INSERT INTO downloadable_documents (title, description, file_url, type, expiry_date, uploaded_by_admin_id, created_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`, [title, description, file_url, type, expiry_date, req.admin.id] );
            logAdminAction(req.admin.id, 'DOCUMENT_CREATED', `Admin ${req.admin.name} added document: ${title}`, 'downloadable_document', result.lastID, req.ip);
            req.flash('success_msg', 'Document entry added successfully.');
            res.redirect('/admin/documents');
        } catch (err) {
            console.error("Error adding document entry:", err); req.flash('error_msg', 'Failed to add document entry. ' + err.message);
            res.status(500).render('pages/admin/documents/add', { title: 'Add Downloadable Document', admin: req.admin, errors: [{msg: 'Failed to add document entry. ' + err.message}], title_val: title, description_val: description, file_url_val: file_url, type_val: type, expiry_date_val: expiry_date });
        }
    }
];
const renderEditDocumentForm = async (req, res) => { /* ... Existing ... */
    const docId = req.params.id;
    try {
        const document = await db.getAsync("SELECT * FROM downloadable_documents WHERE id = ?", [docId]);
        if (!document) { req.flash('error_msg', 'Document entry not found.'); return res.redirect('/admin/documents');}
        if (document.expiry_date) document.expiry_date_formatted = new Date(document.expiry_date).toISOString().split('T')[0];
        res.render('pages/admin/documents/edit', { title: 'Edit Downloadable Document', admin: req.admin, document, errors: [] });
    } catch (err) {
        console.error("Error fetching document for edit:", err);
        req.flash('error_msg', 'Failed to load document details for editing.');
        res.redirect('/admin/documents');
    }
};
const updateDocument = [ /* ... Existing ... */
    body('title').trim().notEmpty().withMessage('Document title is required.'),
    body('file_url').trim().notEmpty().withMessage('File URL is required.').isURL().withMessage('Must be a valid URL.'),
    body('type').isIn(['public', 'eulogy']).withMessage('Invalid document type.'),
    body('description').trim().optional({ checkFalsy: true }),
    body('expiry_date').optional({ checkFalsy: true }).isISO8601().toDate().withMessage('Invalid expiry date format.'),
    async (req, res) => {
        const docId = req.params.id;
        const errors = validationResult(req);
        let { title, description, file_url, type, expiry_date } = req.body;
        if (!errors.isEmpty()) {
            const documentToReRender = await db.getAsync("SELECT * FROM downloadable_documents WHERE id = ?", [docId]).catch(()=> ({id: docId}));
             if (documentToReRender && documentToReRender.expiry_date) documentToReRender.expiry_date_formatted = new Date(documentToReRender.expiry_date).toISOString().split('T')[0];
            return res.status(400).render('pages/admin/documents/edit', { title: 'Edit Downloadable Document', admin: req.admin, document: { ...documentToReRender, title, description, file_url, type, expiry_date_formatted: expiry_date }, errors: errors.array() });
        }
        if (type === 'public') expiry_date = null;
        else if (type === 'eulogy' && !expiry_date) expiry_date = null;
        try {
            const result = await db.runAsync( `UPDATE downloadable_documents SET title = ?, description = ?, file_url = ?, type = ?, expiry_date = ?, uploaded_by_admin_id = ? WHERE id = ?`, [title, description, file_url, type, expiry_date, req.admin.id, docId] );
            if (result.changes === 0) req.flash('error_msg', 'Document entry not found or no changes made.');
            else { logAdminAction(req.admin.id, 'DOCUMENT_UPDATED', `Admin ${req.admin.name} updated document: ${title}`, 'downloadable_document', docId, req.ip); req.flash('success_msg', 'Document entry updated successfully.'); }
            res.redirect('/admin/documents');
        } catch (err) {
            console.error("Error updating document entry:", err);
            req.flash('error_msg', 'Failed to update document entry. ' + err.message);
            res.redirect(`/admin/documents/edit/${docId}`);
        }
    }
];
const deleteDocument = async (req, res) => { /* ... Existing ... */
    const docId = req.params.id;
    try {
        const result = await db.runAsync("DELETE FROM downloadable_documents WHERE id = ?", [docId]);
        if (result.changes === 0) req.flash('error_msg', 'Document entry not found.');
        else { logAdminAction(req.admin.id, 'DOCUMENT_DELETED', `Admin ${req.admin.name} deleted document entry ID: ${docId}`, 'downloadable_document', docId, req.ip); req.flash('success_msg', 'Document entry deleted successfully.');}
        res.redirect('/admin/documents');
    } catch (err) {
        console.error("Error deleting document entry:", err);
        req.flash('error_msg', 'Failed to delete document entry. ' + err.message);
        res.redirect('/admin/documents');
    }
};
const adminResetStudentPassword = async (req, res) => { /* ... Existing ... */
    const studentId = req.params.studentId;
    const adminPerformingAction = req.admin;
    try {
        const student = await db.getAsync("SELECT id, first_name, email FROM students WHERE id = ?", [studentId]);
        if (!student) { req.flash('error_msg', 'Student not found.'); return res.redirect('/admin/students'); }
        const defaultPassword = process.env.DEFAULT_STUDENT_PASSWORD;
        if (!defaultPassword) { console.error("CRITICAL: DEFAULT_STUDENT_PASSWORD is not set in .env for admin password reset."); req.flash('error_msg', 'Server configuration error: Default student password not defined.'); return res.redirect(`/admin/students/view/${studentId}`); }
        const passwordHash = await bcrypt.hash(defaultPassword, 10);
        await db.runAsync( "UPDATE students SET password_hash = ?, requires_password_change = TRUE, updated_at = CURRENT_TIMESTAMP, last_updated_by_admin_id = ?, last_updated_by_admin_name = ? WHERE id = ?", [passwordHash, adminPerformingAction.id, adminPerformingAction.name, studentId] );
        logAdminAction( adminPerformingAction.id, 'STUDENT_PASSWORD_RESET_BY_ADMIN', `Admin ${adminPerformingAction.name} reset password for student ${student.first_name} (ID: ${studentId}) to default.`, 'student', studentId, req.ip );
        req.flash('success_msg', `Password for student ${student.first_name} has been reset to the default. They will be required to change it on next login.`);
        res.redirect(`/admin/students/view/${studentId}`);
    } catch (err) {
        console.error("Error resetting student password by admin:", err);
        req.flash('error_msg', 'Failed to reset student password. ' + err.message);
        res.redirect(`/admin/students/view/${studentId}`);
    }
};

// --- View Action Logs (Admin) ---
const viewActionLogs = async (req, res) => {
    try {
        const logs = await db.allAsync("SELECT * FROM action_logs ORDER BY created_at DESC LIMIT 100");
        res.render('pages/admin/action-logs', {
            title: 'Admin Action Logs',
            admin: req.admin,
            logs
        });
    } catch (err) {
        console.error("Error fetching action logs:", err);
        req.flash('error_msg', 'Failed to load action logs.');
        res.redirect('/admin/dashboard');
    }
};

module.exports = {
    renderRegisterStudentForm, registerStudent,
    listCourses, renderAddCourseForm, addCourse, renderEditCourseForm, updateCourse, deleteCourse,
    listStudents, viewStudentDetails, renderEditStudentForm, updateStudent, toggleStudentStatus,
    renderManageStudentEnrollments, enrollStudentInCourse, removeStudentFromCourse,
    renderEnterMarksForm, saveMarks,
    renderLogFeeForm, saveFeeEntry,
    listNotifications, renderCreateNotificationForm, createNotification, deleteNotification,
    listResources, renderCreateResourceForm, createResource, renderEditResourceForm, updateResource, deleteResource,
    renderWifiSettingsForm, updateWifiSettings,
    listDownloadableDocuments, renderCreateDocumentForm, createDocument, renderEditDocumentForm, updateDocument, deleteDocument,
    viewActionLogs, adminResetStudentPassword,
    renderAdminDashboardWithActivity, // Added new function
    saveAcademicMarksValidation,
    saveAcademicMarks,
    downloadDatabaseBackup // Export new backup function
};

const downloadDatabaseBackup = (req, res) => {
    const { getDbPath } = require('../config/database'); // Import getDbPath specifically here or at top
    const fs = require('fs'); // Node.js fs module, ensure it's at top if not already

    const actualDbPath = getDbPath();

    if (!fs.existsSync(actualDbPath)) {
        console.error("Database file not found for backup:", actualDbPath);
        req.flash('error_msg', 'Database file not found. Cannot perform backup.');
        return res.redirect('/admin/dashboard');
    }

    logAdminAction(req.admin.id, 'DATABASE_BACKUP_DOWNLOADED', `Admin ${req.admin.name} downloaded a database backup.`, 'database', null, req.ip);

    const backupFilename = `twoem_online_backup_${new Date().toISOString().replace(/:/g, '-').split('.')[0]}.sqlite`;

    res.download(actualDbPath, backupFilename, (err) => {
        if (err) {
            console.error("Error downloading database backup:", err);
            if (!res.headersSent) {
                req.flash('error_msg', 'Error downloading database backup. Check server logs.');
                res.redirect('/admin/dashboard');
            } else {
                console.error("Headers already sent, could not send error flash message to client for DB backup failure.");
            }
        }
    });
};


// New function to render admin dashboard with last activity
const renderAdminDashboardWithActivity = async (req, res) => {
    let lastActivityInfo = {
        adminName: 'N/A',
        actionDate: null,
        actionType: 'No recent activity found.'
    };

    try {
        // Get latest student update
        const latestStudentUpdate = await db.getAsync(`
            SELECT updated_at, last_updated_by_admin_name
            FROM students
            WHERE last_updated_by_admin_name IS NOT NULL
            ORDER BY updated_at DESC LIMIT 1
        `);

        // Get latest fee log
        const latestFeeLog = await db.getAsync(`
            SELECT created_at, logged_by_admin_name
            FROM fees
            WHERE logged_by_admin_name IS NOT NULL
            ORDER BY created_at DESC LIMIT 1
        `);

        let studentUpdateTime = latestStudentUpdate ? new Date(latestStudentUpdate.updated_at).getTime() : 0;
        let feeLogTime = latestFeeLog ? new Date(latestFeeLog.created_at).getTime() : 0;

        if (studentUpdateTime > 0 || feeLogTime > 0) {
            if (studentUpdateTime >= feeLogTime) {
                lastActivityInfo.adminName = latestStudentUpdate.last_updated_by_admin_name;
                lastActivityInfo.actionDate = new Date(latestStudentUpdate.updated_at);
                lastActivityInfo.actionType = 'Student Record Update';
            } else {
                lastActivityInfo.adminName = latestFeeLog.logged_by_admin_name;
                lastActivityInfo.actionDate = new Date(latestFeeLog.created_at);
                lastActivityInfo.actionType = 'Fee Log Entry';
            }
        }
    } catch (err) {
        console.error("Error fetching last activity for admin dashboard:", err);
        // Keep default lastActivityInfo on error, or set a specific error message
        lastActivityInfo.actionType = "Error retrieving activity.";
    }

    res.render('pages/admin-dashboard', {
        title: 'Admin Dashboard',
        admin: req.admin,
        lastActivityInfo
    });
};
