const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// Student Login
const loginStudent = async (req, res) => {
    const { registrationNumber, password } = req.body;

    if (!registrationNumber || !password) {
        return res.status(400).render('pages/student-login', {
            title: 'Student Portal Login',
            error: 'Registration number and password are required.',
            activeTab: 'login-panel' // To keep the login tab active on error
        });
    }

    try {
        const student = await db.getAsync("SELECT * FROM students WHERE registration_number = ?", [registrationNumber]);

        if (!student) {
            return res.status(401).render('pages/student-login', {
                title: 'Student Portal Login',
                error: 'Invalid registration number or password.',
                activeTab: 'login-panel'
            });
        }

        const isMatch = await bcrypt.compare(password, student.password_hash);
        if (!isMatch) {
            return res.status(401).render('pages/student-login', {
                title: 'Student Portal Login',
                error: 'Invalid registration number or password.',
                activeTab: 'login-panel'
            });
        }

        // Update last_login_at
        await db.runAsync("UPDATE students SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [student.id]);

        // Generate JWT for student
        const token = jwt.sign(
            {
                id: student.id,
                registrationNumber: student.registration_number,
                email: student.email,
                firstName: student.first_name,
                // isAdmin: false, // Explicitly set isAdmin to false or omit
                // isStudent: true // Good practice to add
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRE || '1h' } // Use same expiry as admin for now
        );

        // Set JWT in an HTTPOnly cookie
        // Using same 'token' cookie name as admin. This means an admin and student cannot be meaningfully logged in
        // simultaneously in the same browser. If this needs to change, use different cookie names.
        // The path restriction on the admin cookie ('/admin') helps, but student routes don't have this yet.
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: parseInt(process.env.JWT_EXPIRE_MS || (1 * 60 * 60 * 1000).toString(), 10), // Default 1 hour
            path: '/' // Cookie accessible on all paths for student
        });

        // First login flow check
        if (student.requires_password_change) {
            return res.redirect('/student/change-password-initial');
        }
        if (!student.is_profile_complete) {
            return res.redirect('/student/complete-profile-initial');
        }

        res.redirect('/student/dashboard');

    } catch (err) {
        console.error("Student login error:", err);
        res.status(500).render('pages/student-login', {
            title: 'Student Portal Login',
            error: 'An error occurred during login. Please try again.',
            activeTab: 'login-panel'
        });
    }
};

// Placeholder for other student auth functions (logout, password change, profile completion)
const logoutStudent = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        path: '/'
    });
    req.flash('success_msg', 'You have been logged out successfully.');
    res.redirect('/student/login');
};


// Render initial password change form
const renderChangePasswordInitialForm = (req, res) => {
    // Check if password change is actually required
    // This route should only be accessible if requires_password_change is true
    // The login function already redirects here. An extra check could be added.
    // const student = await db.getAsync("SELECT requires_password_change FROM students WHERE id = ?", [req.student.id]);
    // if (!student || !student.requires_password_change) return res.redirect('/student/dashboard');

    res.render('pages/student/change-password-initial', {
        title: 'Change Your Password',
        student: req.student, // from authStudent middleware
        // Pass process.env for template access if needed for PASSWORD_MIN_LENGTH, DEFAULT_STUDENT_PASSWORD
        // Note: EJS doesn't have direct access to process.env unless passed.
        // For security, it's better to pass specific values rather than the whole process object.
        defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD,
        passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8
    });
};

// Handle initial password change
const handleChangePasswordInitial = async (req, res) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const studentId = req.student.id; // from authStudent middleware

    const renderWithError = (errorMsg, errorsArray = []) => {
        return res.status(400).render('pages/student/change-password-initial', {
            title: 'Change Your Password',
            student: req.student,
            error: errorMsg,
            errors: errorsArray,
            defaultStudentPassword: process.env.DEFAULT_STUDENT_PASSWORD,
            passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8
        });
    };

    if (currentPassword !== process.env.DEFAULT_STUDENT_PASSWORD) {
        return renderWithError('Incorrect current default password.');
    }
    if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8)) {
        return renderWithError(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters long.`);
    }
    if (newPassword !== confirmNewPassword) {
        return renderWithError('New passwords do not match.');
    }
    if (newPassword === process.env.DEFAULT_STUDENT_PASSWORD) {
        return renderWithError('New password cannot be the same as the default password.');
    }

    try {
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.runAsync(
            "UPDATE students SET password_hash = ?, requires_password_change = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [newPasswordHash, studentId]
        );

        // Check if profile completion is needed next
        const updatedStudent = await db.getAsync("SELECT is_profile_complete FROM students WHERE id = ?", [studentId]);
        if (!updatedStudent.is_profile_complete) {
            req.flash('success_msg', 'Password changed successfully. Please complete your profile.');
            res.redirect('/student/complete-profile-initial');
        } else {
            req.flash('success_msg', 'Password changed successfully.');
            res.redirect('/student/dashboard');
        }
    } catch (err) {
        console.error("Error changing initial password:", err);
        // renderWithError handles rendering the form with the error message
        renderWithError('An error occurred while changing password. Please try again.');
    }
};

// Render initial profile completion form (Next of Kin)
const renderCompleteProfileInitialForm = (req, res) => {
    // Similar to password change, ensure this is only accessible if needed.
    // const student = await db.getAsync("SELECT is_profile_complete, requires_password_change FROM students WHERE id = ?", [req.student.id]);
    // if (!student || student.is_profile_complete || student.requires_password_change) return res.redirect('/student/dashboard');

    res.render('pages/student/complete-profile-initial', {
        title: 'Complete Your Profile',
        student: req.student,
        nokName: '', nokRelationship: '', nokPhone: '', nokEmail: '' // For pre-filling if validation fails
    });
};

// Handle initial profile completion
const handleCompleteProfileInitial = async (req, res) => {
    const { nokName, nokRelationship, nokPhone, nokEmail } = req.body;
    const studentId = req.student.id;

    if (!nokName || !nokRelationship || !nokPhone) {
        return res.status(400).render('pages/student/complete-profile-initial', {
            title: 'Complete Your Profile',
            student: req.student,
            error: 'Please fill in all required Next of Kin details (Name, Relationship, Phone).',
            nokName, nokRelationship, nokPhone, nokEmail // Pre-fill form
        });
    }

    const nokDetails = JSON.stringify({ name: nokName, relationship: nokRelationship, phone: nokPhone, email: nokEmail });

    try {
        await db.runAsync(
            "UPDATE students SET next_of_kin_details = ?, is_profile_complete = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [nokDetails, studentId]
        );
        req.flash('success_msg', 'Profile completed successfully. Welcome to your dashboard!');
        res.redirect('/student/dashboard');
    } catch (err) {
        console.error("Error completing initial profile:", err);
        // Re-render with error and preserved input
        res.status(500).render('pages/student/complete-profile-initial', {
            title: 'Complete Your Profile',
            student: req.student,
            error: 'An error occurred while saving your profile. Please try again.',
            nokName, nokRelationship, nokPhone, nokEmail // Pre-fill form
        });
    }
};


module.exports = {
    loginStudent,
    logoutStudent,
    renderChangePasswordInitialForm,
    handleChangePasswordInitial,
    renderCompleteProfileInitialForm,
    handleCompleteProfileInitial,
    // Will add handleForgotPassword, renderResetPasswordForm, handleResetPassword
};

// --- Forgot Password / Reset Password ---

// Utility to generate a 6-digit OTP
function generateOtp() {
    const crypto = require('crypto');
    return crypto.randomInt(100000, 999999).toString();
}

const handleForgotPassword = async (req, res) => {
    const { registrationNumber, email } = req.body;
    const activeTabOnError = 'forgot-password-panel'; // For student-login.ejs

    if (!registrationNumber || !email) {
        return res.status(400).render('pages/student-login', {
            title: 'Student Portal Login',
            error: 'Registration number and email are required for password reset.',
            activeTab: activeTabOnError
        });
    }

    try {
        const student = await db.getAsync(
            "SELECT id, email, first_name FROM students WHERE registration_number = ? AND email = ?",
            [registrationNumber, email.toLowerCase().trim()]
        );

        if (!student) {
            return res.status(404).render('pages/student-login', {
                title: 'Student Portal Login',
                error: 'No student found with that registration number and email address.',
                activeTab: activeTabOnError
            });
        }

        const otp = generateOtp();
        const otpHash = await bcrypt.hash(otp, 10);
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // OTP expires in 10 minutes

        // Store OTP hash in database
        await db.runAsync(
            "INSERT INTO password_reset_tokens (student_id, token_hash, expires_at) VALUES (?, ?, ?)",
            [student.id, otpHash, expiresAt.toISOString()]
        );

        // Send OTP email (using mailer.js - ensure it's imported if not already)
        const { sendEmail } = require('../config/mailer'); // Assuming mailer.js is set up
        const emailHtml = `
            <p>Hello ${student.first_name},</p>
            <p>You requested a password reset for your Twoem Online Productions student account.</p>
            <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
            <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
            <p>Enter this OTP on the password reset page.</p>
            <br>
            <p>Thank you,</p>
            <p>Twoem Online Productions Team</p>
        `;
        const emailSubject = "Your Password Reset OTP - Twoem Online Productions";

        await sendEmail({
            to: student.email,
            subject: emailSubject,
            html: emailHtml,
            // replyTo: process.env.REPLY_TO_EMAIL (optional, for system emails)
        });

        req.flash('success_msg', 'OTP sent to your email. Please check your inbox (and spam folder).');
        // Redirect to a page where user can enter OTP and new password
        // Pass student_id or email or reg_no to identify the user on the next step
        // Using query params for simplicity here. A temporary session might be more secure for regNo.
        res.redirect(`/student/reset-password-form?regNo=${encodeURIComponent(registrationNumber)}`);

    } catch (err) {
        console.error("Forgot password error:", err);
        req.flash('error_msg', 'An error occurred while processing your request. Please try again.');
        res.redirect('/student/login#forgot-password-panel'); // Redirect back to forgot password tab
    }
};

// Render the form to enter OTP and new password
const renderResetPasswordForm = (req, res) => {
    const { regNo, message, error } = req.query;
    if (!regNo) {
        // If regNo is missing, perhaps redirect to login or show a generic error
        return res.redirect('/student/login?error=Invalid+password+reset+link+or+session.');
    }
    res.render('pages/student/reset-password-form', {
        title: 'Reset Your Password',
        registrationNumber: regNo,
        message,
        error,
        passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8
    });
};

// Handle the actual password reset after OTP verification
const handleResetPassword = async (req, res) => {
    const { registrationNumber, otp, newPassword, confirmNewPassword } = req.body;

    const renderErrorOnResetForm = (errorMsg) => {
        return res.status(400).render('pages/student/reset-password-form', {
            title: 'Reset Your Password',
            registrationNumber,
            error: errorMsg,
            passwordMinLength: process.env.PASSWORD_MIN_LENGTH || 8
        });
    };

    if (!registrationNumber || !otp || !newPassword || !confirmNewPassword) {
        return renderErrorOnResetForm('All fields are required.');
    }
    if (newPassword.length < (parseInt(process.env.PASSWORD_MIN_LENGTH, 10) || 8)) {
        return renderErrorOnResetForm(`New password must be at least ${process.env.PASSWORD_MIN_LENGTH || 8} characters.`);
    }
    if (newPassword !== confirmNewPassword) {
        return renderErrorOnResetForm('New passwords do not match.');
    }

    try {
        const student = await db.getAsync("SELECT id FROM students WHERE registration_number = ?", [registrationNumber]);
        if (!student) {
            return renderErrorOnResetForm('Invalid registration number.'); // Should not happen if regNo came from previous step
        }

        // Find the latest, non-used OTP for this student
        const tokenRecord = await db.getAsync(
            "SELECT * FROM password_reset_tokens WHERE student_id = ? AND used = FALSE ORDER BY created_at DESC LIMIT 1",
            [student.id]
        );

        if (!tokenRecord) {
            return renderErrorOnResetForm('No pending password reset request found, or OTP already used. Please request a new OTP.');
        }

        const isOtpMatch = await bcrypt.compare(otp, tokenRecord.token_hash);
        if (!isOtpMatch) {
            return renderErrorOnResetForm('Invalid OTP. Please check and try again.');
        }

        if (new Date() > new Date(tokenRecord.expires_at)) {
            // Mark as used even if expired, to prevent reuse of old links/OTPs
            await db.runAsync("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", [tokenRecord.id]);
            return renderErrorOnResetForm('OTP has expired. Please request a new one.');
        }

        // Check if new password is same as default password (if student is still on default)
        // Or if it's same as current password (more complex, requires fetching current hash)
        // For simplicity, just ensuring it's not the default password if they were resetting from that.
        const studentDetails = await db.getAsync("SELECT requires_password_change FROM students WHERE id = ?", [student.id]);
        if (studentDetails.requires_password_change && newPassword === process.env.DEFAULT_STUDENT_PASSWORD) {
             return renderErrorOnResetForm('New password cannot be the same as the default password if you are resetting from it.');
        }


        // All checks passed, update password and mark OTP as used
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.runAsync(
            "UPDATE students SET password_hash = ?, requires_password_change = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [newPasswordHash, student.id]
        );
        await db.runAsync("UPDATE password_reset_tokens SET used = TRUE WHERE id = ?", [tokenRecord.id]);

        req.flash('success_msg', 'Password reset successfully. You can now login with your new password.');
        res.redirect('/student/login');

    } catch (err) {
        console.error("Error resetting password:", err);
        // renderErrorOnResetForm already handles rendering the form with the error.
        renderErrorOnResetForm('An error occurred while resetting your password. Please try again.');
    }
};

module.exports = {
    loginStudent,
    logoutStudent,
    renderChangePasswordInitialForm,
    handleChangePasswordInitial,
    renderCompleteProfileInitialForm,
    handleCompleteProfileInitial,
    handleForgotPassword,
    renderResetPasswordForm,
    handleResetPassword
};
