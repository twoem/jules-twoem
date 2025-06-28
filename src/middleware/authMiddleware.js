const jwt = require('jsonwebtoken');

// Helper function to get JWT secret (consistent with authAdminController)
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        console.error(
            "CRITICAL SECURITY WARNING: JWT_SECRET is not defined, empty, or too short (less than 32 characters) in .env. " +
            "Using a default development secret. THIS IS INSECURE AND MUST BE FIXED FOR PRODUCTION."
        );
        return process.env.NODE_ENV === 'production'
            ? ' fallback_prod_secret_that_is_very_long_and_random_and_changed_immediately'
            : 'dev_fallback_secret_must_be_long_and_random_at_least_32_chars';
    }
    return secret;
};

// Middleware to authenticate admins
const authAdmin = (req, res, next) => {
    console.log(`[AuthAdmin] Path: ${req.method} ${req.originalUrl}`);
    console.log('[AuthAdmin] All Cookies:', req.cookies);
    const token = req.cookies.token;

    if (!token) {
        console.log('[AuthAdmin] No token found in cookies.');
        return res.status(401).redirect('/admin/login?error=Authentication+required.+Please+login.');
    }

    try {
        console.log('[AuthAdmin] Token found. Verifying...');
        const decoded = jwt.verify(token, getJwtSecret()); // Use helper
        console.log('[AuthAdmin] Token decoded successfully:', decoded.email, 'isAdmin:', decoded.isAdmin);

        if (!decoded.isAdmin) {
            console.log('[AuthAdmin] Token does not have isAdmin=true.');
            return res.status(403).redirect('/admin/login?error=Forbidden.+Admin+privileges+required.');
        }
        req.admin = decoded;
        console.log('[AuthAdmin] Admin authenticated:', req.admin.email);
        next();
    } catch (err) {
        console.error('[AuthAdmin] JWT Verification Error:', err.name, err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).redirect('/admin/login?error=Session+expired.+Please+login+again.');
        }
        return res.status(401).redirect('/admin/login?error=Invalid+session.+Please+login+again.');
    }
};

// Middleware to authenticate students
const authStudent = (req, res, next) => {
    // Add similar logging as authAdmin for debugging student sessions if needed
    console.log(`[AuthStudent] Path: ${req.method} ${req.originalUrl}`);
    console.log('[AuthStudent] All Cookies:', req.cookies);
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).redirect('/student/login?error=Authentication+required.+Please+login.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.isAdmin === true) {
            return res.status(403).redirect('/student/login?error=Access+denied.+Please+use+a+student+account.');
        }
        req.student = decoded;
        next();
    } catch (err) {
        console.error('Student JWT verification error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).redirect('/student/login?error=Session+expired.+Please+login+again.');
        }
        return res.status(401).redirect('/student/login?error=Invalid+session.+Please+login+again.');
    }
};

module.exports = {
    authAdmin,
    authStudent
};
