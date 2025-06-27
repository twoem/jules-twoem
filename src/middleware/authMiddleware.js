const jwt = require('jsonwebtoken');

// Middleware to authenticate admins
const authAdmin = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).redirect('/admin/login?error=Authentication+required.+Please+login.');
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isAdmin) { // Check for the isAdmin claim
            return res.status(403).redirect('/admin/login?error=Forbidden.+Admin+privileges+required.');
        }
        req.admin = decoded; // Attach decoded admin info to request object
        next();
    } catch (err) {
        console.error('Admin JWT verification error:', err.message);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).redirect('/admin/login?error=Session+expired.+Please+login+again.');
        }
        return res.status(401).redirect('/admin/login?error=Invalid+session.+Please+login+again.');
    }
};

// Middleware to authenticate students
const authStudent = (req, res, next) => {
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
