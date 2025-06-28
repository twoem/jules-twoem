const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Ensure jwt is required

// Helper function to get JWT secret
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
        console.error(
            "CRITICAL SECURITY WARNING: JWT_SECRET is not defined, empty, or too short (less than 32 characters) in .env. " +
            "Using a default development secret. THIS IS INSECURE AND MUST BE FIXED FOR PRODUCTION."
        );
        // This fallback is for development convenience ONLY.
        // In a production environment, the application should ideally fail to start if JWT_SECRET is missing or insecure.
        return process.env.NODE_ENV === 'production'
            ? ' fallback_prod_secret_that_is_very_long_and_random_and_changed_immediately' // This should never be used in real prod
            : 'dev_fallback_secret_must_be_long_and_random_at_least_32_chars';
    }
    return secret;
};

// Admin login logic
const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).render('pages/admin-login', {
            title: 'Admin Login',
            error: 'Email and password are required.'
        });
    }

    let authenticatedAdmin = null;

    for (let i = 1; i <= 3; i++) {
        const adminEmail = process.env[`ADMIN${i}_EMAIL`];
        const adminPasswordHash = process.env[`ADMIN${i}_PASSWORD_HASH`];
        const adminName = process.env[`ADMIN${i}_NAME`];

        if (adminEmail === email) {
            if (!adminPasswordHash || adminPasswordHash.startsWith("PLACEHOLDER_BCRYPT_HASH") || adminPasswordHash.length < 20) { // Added length check
                console.warn(`Admin ${i} (${adminEmail}) email matched, but ADMIN${i}_PASSWORD_HASH is not a valid hash in .env.`);
                continue;
            }
            try {
                const isMatch = await bcrypt.compare(password, adminPasswordHash);
                if (isMatch) {
                    authenticatedAdmin = {
                        id: `admin${i}`,
                        email: adminEmail,
                        name: adminName || `Admin ${i}`
                    };
                    break;
                }
            } catch (compareError) {
                console.error(`Error comparing hash for admin ${i} (${adminEmail}):`, compareError);
            }
        }
    }

    if (!authenticatedAdmin) {
        return res.status(401).render('pages/admin-login', {
            title: 'Admin Login',
            error: 'Invalid credentials.'
        });
    }

    try {
        const token = jwt.sign(
            {
                id: authenticatedAdmin.id,
                email: authenticatedAdmin.email,
                name: authenticatedAdmin.name,
                isAdmin: true
            },
            getJwtSecret(), // Use helper function
            { expiresIn: process.env.JWT_EXPIRE || '1h' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: parseInt(process.env.JWT_EXPIRE_MS || (1 * 60 * 60 * 1000).toString(), 10),
            path: '/admin'
        });

        res.redirect('/admin/dashboard');

    } catch (jwtError) {
        console.error('Error generating JWT for admin:', jwtError);
        return res.status(500).render('pages/admin-login', {
            title: 'Admin Login',
            error: 'Login failed due to a server error. Please try again later.'
        });
    }
};

// Admin logout logic
const logoutAdmin = (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(0),
        path: '/admin'
    });
    req.flash('success_msg', 'You have been logged out successfully.');
    res.redirect('/admin/login');
};

module.exports = {
    loginAdmin,
    logoutAdmin
};
