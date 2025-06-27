const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { body, validationResult } = require('express-validator');

// Student Login
const loginStudent = async (req, res) => { /* ... जस का तस ... */
    const { registrationNumber, password } = req.body;
    if (!registrationNumber || !password) {
        return res.status(400).render('pages/student-login', { title: 'Student Portal Login', error: 'Registration number and password are required.', activeTab: 'login-panel'});
    }
    try {
        const student = await db.getAsync("SELECT * FROM students WHERE registration_number = ?", [registrationNumber]);
        if (!student) {
            return res.status(401).render('pages/student-login', { title: 'Student Portal Login', error: 'Invalid registration number or password.', activeTab: 'login-panel'});
        }
        const isMatch = await bcrypt.compare(password, student.password_hash);
        if (!isMatch) {
            return res.status(401).render('pages/student-login', { title: 'Student Portal Login', error: 'Invalid registration number or password.', activeTab: 'login-panel'});
        }
        await db.runAsync("UPDATE students SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [student.id]);
        const token = jwt.sign({ id: student.id, registrationNumber: student.registration_number, email: student.email, firstName: student.first_name }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '1h' });
        res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: parseInt(process.env.JWT_EXPIRE_MS || (1 * 60 * 60 * 1000).toString(), 10), path: '/' });
        if (student.requires_password_change) return res.redirect('/student/change-password-initial');
        if (!student.is_profile_complete) return res.redirect('/student/complete-profile-initial');
        res.redirect('/student/dashboard');
    } catch (err) {
        console.error("Student login error:", err);
        res.status(500).render('pages/student-login', { title: 'Student Portal Login', error: 'An error occurred during login. Please try again.', activeTab: 'login-panel'});
    }
};
const logoutStudent = (req, res) => { /* ... जस का तस ... */
    res.cookie('token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', expires: new Date(0), path: '/' });
    req.flash('success_msg', 'You have been logged out successfully.');
    res.redirect('/student/login');
};
const renderChangePasswordInitialForm = (req, res) => { /* ... जस का तस ... */
    res.render('pages/student/change-password-initial', { title: 'Change Your Password', student: req.student, defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD, passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8 });
};
const handleChangePasswordInitial = async (req, res) => { /* ... जस का तस ... */
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const studentId = req.student.id;
    const renderWithError = (errorMsg) => {
        req.flash('error_msg', errorMsg);
        return res.redirect('/student/change-password-initial');
    };
    if (currentPassword !== process.env.DEFAULT_STUDENT_PASSWORD) return renderWithError('Incorrect current default password.');
    if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8)) return renderWithError(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long.`);
    if (newPassword !== confirmNewPassword) return renderWithError('New passwords do not match.');
    if (newPassword === process.env.DEFAULT_STUDENT_PASSWORD) return renderWithError('New password cannot be the same as the default password.');
    try {
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.runAsync("UPDATE students SET password_hash = ?, requires_password_change = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newPasswordHash, studentId]);
        const updatedStudent = await db.getAsync("SELECT is_profile_complete FROM students WHERE id = ?", [studentId]);
        if (!updatedStudent.is_profile_complete) {
            req.flash('success_msg', 'Password changed successfully. Please complete your profile.');
            res.redirect('/student/complete-profile-initial');
        } else {
            req.flash('success_msg', 'Password changed successfully.');
            res.redirect('/student/dashboard');
        }
    } catch (err) { console.error("Error changing initial password:", err); req.flash('error_msg', 'An error occurred while changing password.'); res.redirect('/student/change-password-initial');}
};
const renderCompleteProfileInitialForm = (req, res) => { /* ... जस का तस ... */
    res.render('pages/student/complete-profile-initial', { title: 'Complete Your Profile', student: req.student, nokName: '', nokRelationship: '', nokPhone: '', nokEmail: '' });
};
const handleCompleteProfileInitial = async (req, res) => { /* ... जस का तस ... */
    const { nokName, nokRelationship, nokPhone, nokEmail } = req.body;
    const studentId = req.student.id;
    if (!nokName || !nokRelationship || !nokPhone) {
        req.flash('error_msg', 'Please fill in all required Next of Kin details (Name, Relationship, Phone).');
        return res.status(400).render('pages/student/complete-profile-initial', { title: 'Complete Your Profile', student: req.student, error: req.flash('error_msg'), nokName, nokRelationship, nokPhone, nokEmail });
    }
    const nokDetails = JSON.stringify({ name: nokName, relationship: nokRelationship, phone: nokPhone, email: nokEmail });
    try {
        await db.runAsync("UPDATE students SET next_of_kin_details = ?, is_profile_complete = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [nokDetails, studentId]);
        req.flash('success_msg', 'Profile completed successfully. Welcome to your dashboard!');
        res.redirect('/student/dashboard');
    } catch (err) {
        console.error("Error completing initial profile:", err);
        req.flash('error_msg', 'An error occurred while saving your profile.');
        res.status(500).render('pages/student/complete-profile-initial', { title: 'Complete Your Profile', student: req.student, error: req.flash('error_msg'), nokName, nokRelationship, nokPhone, nokEmail });
    }
};
function generateOtp() { /* ... जस का तस ... */
    const crypto = require('crypto');
    return crypto.randomInt(100000, 999999).toString();
}
const handleForgotPassword = async (req, res) => { /* ... जस का तस ... */
    const { registrationNumber, email } = req.body;
    const activeTabOnError = 'forgot-password-panel';
    if (!registrationNumber || !email) { return res.status(400).render('pages/student-login', { title: 'Student Portal Login', error: 'Registration number and email are required for password reset.', activeTab: activeTabOnError }); }
    try {
        const student = await db.getAsync("SELECT id, email, first_name FROM students WHERE registration_number = ? AND email = ?", [registrationNumber, email.toLowerCase().trim()]);
        if (!student) { return res.status(404).render('pages/student-login', { title: 'Student Portal Login', error: 'No student found with that registration number and email address.', activeTab: activeTabOnError }); }
        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await db.runAsync("INSERT INTO password_reset_tokens (student_id, token_hash, expires_at) VALUES (?, ?, ?)", [student.id, otpHash, expiresAt.toISOString()]);
        const { sendEmail } = require('../config/mailer');
        const emailHtml = `<p>Hello ${student.first_name},</p><p>Your OTP for password reset is: <strong>${otp}</strong></p><p>This OTP is valid for 10 minutes.</p>`;
        await sendEmail({ to: student.email, subject: "Your Password Reset OTP", html: emailHtml });
        req.flash('success_msg', 'OTP sent to your email. Please check your inbox.');
        res.redirect(`/student/reset-password-form?regNo=${encodeURIComponent(registrationNumber)}`);
    } catch (err) { console.error("Forgot password error:", err); req.flash('error_msg', 'An error occurred. Please try again.'); res.redirect('/student/login#forgot-password-panel'); }
};
const renderResetPasswordForm = (req, res) => { /* ... जस का तस ... */
    const { regNo, message, error } = req.query;
    if (!regNo) return res.redirect('/student/login?error=Invalid+password+reset+link.');
    res.render('pages/student/reset-password-form', { title: 'Reset Your Password', registrationNumber: regNo, message, error, passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8 });
};
const handleResetPassword = async (req, res) => { /* ... जस का तस ... */
    const { registrationNumber, otp, newPassword, confirmNewPassword } = req.body;
    const renderErrorOnResetForm = (errorMsg) => {
        req.flash('error_msg', errorMsg);
        return res.redirect(`/student/reset-password-form?regNo=${encodeURIComponent(registrationNumber)}`);
    };
    if (!registrationNumber || !otp || !newPassword || !confirmNewPassword) return renderErrorOnResetForm('All fields are required.');
    if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8)) return renderErrorOnResetForm(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters.`);
    if (newPassword !== confirmNewPassword) return renderErrorOnResetForm('New passwords do not match.');
    try {
        const student = await db.getAsync("SELECT id FROM students WHERE registration_number = ?", [registrationNumber]);
        if (!student) return renderErrorOnResetForm('Invalid registration number.');
        const tokenRecord = await db.getAsync("SELECT * FROM password_reset_tokens WHERE student_id = ? AND used = FALSE ORDER BY created_at DESC LIMIT 1", [student.id]);
        if (!tokenRecord) return renderErrorOnResetForm('No pending OTP found or already used.');
        const isOtpMatch = await bcrypt.compare(otp, tokenRecord.token_hash);
        if (!isOtpMatch) return renderErrorOnResetForm('Invalid OTP.');
        if (new Date() > new Date(tokenRecord.expires_at)) { await db.runAsync("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", [tokenRecord.id]); return renderErrorOnResetForm('OTP has expired.'); }
        const studentDetails = await db.getAsync("SELECT requires_password_change FROM students WHERE id = ?", [student.id]);
        if (studentDetails.requires_password_change && newPassword === process.env.DEFAULT_STUDENT_PASSWORD) return renderErrorOnResetForm('New password cannot be the default password.');
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.runAsync("UPDATE students SET password_hash = ?, requires_password_change = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newPasswordHash, student.id]);
        await db.runAsync("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", [tokenRecord.id]);
        req.flash('success_msg', 'Password reset successfully. You can now login.');
        res.redirect('/student/login');
    } catch (err) { console.error("Error resetting password:", err); req.flash('error_msg', 'An error occurred. Please try again.'); res.redirect(`/student/reset-password-form?regNo=${encodeURIComponent(registrationNumber)}`);}
};
const listMyStudyResources = async (req, res) => { /* ... जस का तस ... */
    const studentId = req.student.id;
    try {
        const enrolledCourses = await db.allAsync("SELECT course_id FROM enrollments WHERE student_id = ?", [studentId]);
        const enrolledCourseIds = enrolledCourses.map(ec => ec.course_id);
        let resources = [];
        let query = `SELECT sr.*, NULL as course_name FROM study_resources sr WHERE sr.course_id IS NULL`;
        let queryParams = [];
        if (enrolledCourseIds.length > 0) {
            const placeholders = enrolledCourseIds.map(() => '?').join(',');
            query += ` UNION ALL SELECT sr.*, c.name as course_name FROM study_resources sr JOIN courses c ON sr.course_id = c.id WHERE sr.course_id IN (${placeholders})`;
            queryParams.push(...enrolledCourseIds);
        }
        query += " ORDER BY course_name ASC, created_at DESC";
        resources = await db.allAsync(query, queryParams);
        const groupedResources = resources.reduce((acc, resource) => {
            const courseKey = resource.course_name || 'General Resources';
            if (!acc[courseKey]) acc[courseKey] = [];
            acc[courseKey].push(resource);
            return acc;
        }, {});
        res.render('pages/student/study-resources', { title: 'My Study Resources', student: req.student, groupedResources });
    } catch (err) { console.error("Error fetching student study resources:", err); req.flash('error_msg', 'Could not retrieve study resources.'); res.redirect('/student/dashboard'); }
};
const viewMyFees = async (req, res) => { /* ... जस का तस ... */
    const studentId = req.student.id;
    try {
        const fees = await db.allAsync(`SELECT description, total_amount, amount_paid, (total_amount - amount_paid) as balance, payment_date, payment_method, notes, created_at FROM fees WHERE student_id = ? ORDER BY payment_date DESC, created_at DESC`, [studentId]);
        let totalCharged = 0, totalPaid = 0;
        fees.forEach(fee => { totalCharged += fee.total_amount || 0; totalPaid += fee.amount_paid || 0; });
        const overallBalance = totalCharged - totalPaid;
        res.render('pages/student/fees', { title: 'My Fee Statement', student: req.student, fees: fees || [], overallBalance });
    } catch (err) { console.error("Error fetching student fee records:", err); req.flash('error_msg', 'Could not retrieve fee statement.'); res.redirect('/student/dashboard'); }
};
const viewMyAcademics = async (req, res) => { /* ... जस का तस ... */
    const studentId = req.student.id;
    try {
        const student = await db.getAsync("SELECT id, first_name FROM students WHERE id = ?", [studentId]);
        if (!student) { req.flash('error_msg', 'Student record not found.'); return res.redirect('/student/login'); }
        const enrollments = await db.allAsync(`SELECT e.id as enrollment_id, c.name AS course_name, e.enrollment_date, e.coursework_marks, e.main_exam_marks, ((COALESCE(e.coursework_marks, 0) * 0.3) + (COALESCE(e.main_exam_marks, 0) * 0.7)) AS total_score, e.final_grade, e.certificate_issued_at FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = ? ORDER BY c.name`, [studentId]);
        res.render('pages/student/academics', { title: 'My Academic Records', student: req.student, enrollments: enrollments || [], PASSING_GRADE: parseInt(process.env.PASSING_GRADE) || 60 });
    } catch (err) { console.error("Error fetching student academic records:", err); req.flash('error_msg', 'Could not retrieve academic records.'); res.redirect('/student/dashboard'); }
};
const viewWifiCredentials = async (req, res) => { /* ... जस का तस ... */
    try {
        const settingKeys = ['wifi_ssid', 'wifi_password_plaintext', 'wifi_disclaimer'];
        const settingsData = await db.allAsync( `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?, ?, ?)`, settingsKeys );
        const settings = {};
        settingsData.forEach(row => { settings[row.setting_key] = row.setting_value; });
        res.render('pages/student/wifi-credentials', { title: 'WiFi Credentials', student: req.student, wifi_ssid: settings.wifi_ssid || 'Not Set by Admin', wifi_password: settings.wifi_password_plaintext || 'Not Set by Admin', wifi_disclaimer: settings.wifi_disclaimer || '' });
    } catch (err) {
        console.error("Error fetching WiFi credentials for student:", err);
        req.flash('error_msg', 'Could not retrieve WiFi information at this time.');
        res.redirect('/student/dashboard');
    }
};
const renderMyCertificatesPage = async (req, res) => { /* ... जस का तस ... */
    const studentId = req.student.id;
    try {
        const feeRecords = await db.allAsync("SELECT total_amount, amount_paid FROM fees WHERE student_id = ?", [studentId]);
        let totalCharged = 0; let totalPaid = 0;
        feeRecords.forEach(fee => { totalCharged += fee.total_amount || 0; totalPaid += fee.amount_paid || 0; });
        const feesCleared = (totalCharged - totalPaid) <= 0;
        const passedEnrollments = await db.allAsync(`SELECT e.id as enrollment_id, c.name as course_name, e.final_grade, e.certificate_issued_at FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.student_id = ? AND e.final_grade = 'Pass' ORDER BY c.name`, [studentId]);
        const eligibleCertificates = passedEnrollments.map(pe => ({ ...pe, is_eligible_for_download: feesCleared }));
        res.render('pages/student/certificates', { title: 'My Certificates', student: req.student, eligibleCertificates, feesCleared });
    } catch (err) { console.error("Error fetching certificate eligibility:", err); req.flash('error_msg', 'Could not retrieve certificate information.'); res.redirect('/student/dashboard'); }
};
const downloadCertificate = async (req, res) => { /* ... जस का तस ... */
    const studentId = req.student.id;
    const enrollmentId = req.params.enrollmentId;
    try {
        const feeRecords = await db.allAsync("SELECT total_amount, amount_paid FROM fees WHERE student_id = ?", [studentId]);
        let totalCharged = 0; let totalPaid = 0;
        feeRecords.forEach(fee => { totalCharged += fee.total_amount || 0; totalPaid += fee.amount_paid || 0; });
        const feesCleared = (totalCharged - totalPaid) <= 0;
        const enrollment = await db.getAsync(`SELECT e.id, s.first_name as student_name, s.registration_number, c.name as course_name, e.final_grade, e.updated_at as completion_date FROM enrollments e JOIN students s ON e.student_id = s.id JOIN courses c ON e.course_id = c.id WHERE e.id = ? AND e.student_id = ? AND e.final_grade = 'Pass'`, [enrollmentId, studentId]);
        if (!enrollment) { req.flash('error_msg', 'Course completion record not found or not passed.'); return res.redirect('/student/my-certificates'); }
        if (!feesCleared) { req.flash('error_msg', 'Cannot download certificate due to outstanding fees.'); return res.redirect('/student/my-certificates'); }
        res.render('pages/student/certificate-template', { layout: 'partials/certificate-layout', title: `Certificate - ${enrollment.course_name}`, student_name: enrollment.student_name, course_name: enrollment.course_name, registration_number: enrollment.registration_number, completion_date: new Date(enrollment.completion_date).toLocaleDateString() });
    } catch (err) { console.error("Error generating certificate:", err); req.flash('error_msg', 'Could not generate certificate.'); res.redirect('/student/my-certificates'); }
};

// --- Student Self-Service Profile Updates ---
const renderChangePasswordForm = (req, res) => { /* ... New ... */
    res.render('pages/student/profile/change-password', {
        title: 'Change Password',
        student: req.student,
        passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8
    });
};
const handleChangePassword = async (req, res) => { /* ... New ... */
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const studentId = req.student.id;
    if (!currentPassword || !newPassword || !confirmNewPassword) { req.flash('error_msg', 'All password fields are required.'); return res.redirect('/student/profile/change-password'); }
    if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8)) { req.flash('error_msg', `New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long.`); return res.redirect('/student/profile/change-password'); }
    if (newPassword !== confirmNewPassword) { req.flash('error_msg', 'New passwords do not match.'); return res.redirect('/student/profile/change-password'); }
    try {
        const student = await db.getAsync("SELECT password_hash FROM students WHERE id = ?", [studentId]);
        if (!student) { req.flash('error_msg', 'Student not found.'); return res.redirect('/student/dashboard'); }
        const isMatch = await bcrypt.compare(currentPassword, student.password_hash);
        if (!isMatch) { req.flash('error_msg', 'Incorrect current password.'); return res.redirect('/student/profile/change-password'); }
        const isDefaultPassword = await bcrypt.compare(process.env.DEFAULT_STUDENT_PASSWORD, student.password_hash);
        if (!isDefaultPassword && newPassword === currentPassword) { req.flash('error_msg', 'New password cannot be the same as your current password.'); return res.redirect('/student/profile/change-password');}
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.runAsync( "UPDATE students SET password_hash = ?, requires_password_change = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [newPasswordHash, studentId] );
        req.flash('success_msg', 'Your password has been changed successfully.');
        res.redirect('/student/dashboard');
    } catch (err) { console.error("Error changing student password:", err); req.flash('error_msg', 'An error occurred while changing your password.'); res.redirect('/student/profile/change-password'); }
};
const renderEditNokForm = async (req, res) => { /* ... New ... */
    const studentId = req.student.id;
    try {
        const student = await db.getAsync("SELECT next_of_kin_details FROM students WHERE id = ?", [studentId]);
        let currentNokDetails = {};
        if (student && student.next_of_kin_details) { try { currentNokDetails = JSON.parse(student.next_of_kin_details); } catch (e) { console.error("Error parsing NOK details for student " + studentId, e); }}
        res.render('pages/student/profile/edit-nok', { title: 'Update Next of Kin Details', student: req.student, currentNokDetails });
    } catch (err) { console.error("Error fetching student NOK details for edit form:", err); req.flash('error_msg', 'Could not load your Next of Kin details.'); res.redirect('/student/dashboard'); }
};
const handleUpdateNok = async (req, res) => { /* ... New ... */
    const { nokName, nokRelationship, nokPhone, nokEmail } = req.body;
    const studentId = req.student.id;
    if (!nokName || !nokRelationship || !nokPhone) { req.flash('error_msg', 'Please fill in all required Next of Kin fields (Name, Relationship, Phone).'); return res.redirect('/student/profile/edit-nok'); }
    const nokDetails = JSON.stringify({ name: nokName, relationship: nokRelationship, phone: nokPhone, email: nokEmail || '' });
    try {
        await db.runAsync( "UPDATE students SET next_of_kin_details = ?, is_profile_complete = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [nokDetails, studentId] );
        req.flash('success_msg', 'Next of Kin details updated successfully.');
        res.redirect('/student/dashboard');
    } catch (err) { console.error("Error updating student NOK details:", err); req.flash('error_msg', 'An error occurred while updating your Next of Kin details.'); res.redirect('/student/profile/edit-nok'); }
};

// --- Student Portal - Notifications (Mark as Read) ---
const markNotificationAsRead = async (req, res) => { /* ... Modified listMyNotifications and this new one ... */
    const studentId = req.student.id;
    const notificationId = req.params.notificationId;
    try {
        const existingRead = await db.getAsync( "SELECT id FROM student_notification_reads WHERE student_id = ? AND notification_id = ?", [studentId, notificationId] );
        if (!existingRead) {
            await db.runAsync( "INSERT INTO student_notification_reads (student_id, notification_id) VALUES (?, ?)", [studentId, notificationId] );
        }
        // No flash message needed if it's an AJAX call or background action.
        // If it's a direct POST from a form, redirect is fine.
        res.redirect('/student/notifications');
    } catch (err) {
        console.error("Error marking notification as read:", err);
        req.flash('error_msg', 'Could not mark notification as read.'); // This might not be seen if it's AJAX
        res.redirect('/student/notifications');
    }
};


module.exports = {
    loginStudent, logoutStudent,
    renderChangePasswordInitialForm, handleChangePasswordInitial,
    renderCompleteProfileInitialForm, handleCompleteProfileInitial,
    handleForgotPassword, renderResetPasswordForm, handleResetPassword,
    viewMyAcademics, viewMyFees,
    listMyNotifications, markNotificationAsRead, // Added markNotificationAsRead
    listMyStudyResources, viewWifiCredentials,
    renderMyCertificatesPage, downloadCertificate,
    renderChangePasswordForm, handleChangePassword,
    renderEditNokForm, handleUpdateNok
};
