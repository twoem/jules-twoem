# Twoem Online Productions Website

This is the official website for Twoem Online Productions, currently under development.

## Project Overview

The website aims to provide comprehensive information about services offered by Twoem Online Productions, a student portal for course management, an admin portal for site and student administration, a downloads section, a contact form, and a gallery.

The project is built using:
*   **Backend:** Node.js with Express.js
*   **Templating:** EJS (Embedded JavaScript templates)
*   **Frontend Styling:** Bootstrap 5 (via CDN), custom CSS
*   **Core Features Planned:** User Authentication (JWT, bcrypt), Email (Nodemailer), Database integration (to be specified).

## Current Status (As of this version)

*   Basic Express server setup is complete.
*   EJS templating engine is configured with partials for header, navbar, and footer.
*   Static file serving (CSS, JS, images) is operational.
*   Environment variable management via `.env` is in place.
*   Core pages have been structurally created with placeholder content:
    *   Home Page
    *   Contact Page (form UI is present; email sending logic is implemented but requires valid SMTP credentials in `.env` for actual sending)
    *   Services Page
    *   Downloads Page
    *   Student Login Page (with tabs for Login, Forgot Password, New Student)
    *   Admin Login Page
    *   Student Dashboard (placeholder)
    *   Admin Dashboard (placeholder)
    *   Data Protection Policy Page
    *   Gallery Page
*   Basic routing for all primary sections is implemented.
*   Initial styling using Bootstrap 5 and custom CSS enhancements applied.

## Features (Target End-State)

*   **Home:** Attractive landing page.
*   **Services:** Detailed information on Digital Printing, Government Services, Office Services, Internet Services, and Computer Education.
*   **Downloads:** Sections for Public Documents and time-limited Eulogy documents.
*   **Student Portal:** Secure login, view academic scores, download certificates, check fee balances, receive notifications, access study resources, manage profile (password change, Next of Kin).
*   **Admin Login:** Secure login for administrators.
*   **Admin Dashboard:** Comprehensive management of students (registration, passwords, academics, fees), courses, notifications, study resources, WiFi credentials, site backups, and viewing admin action logs.
*   **Contact:** Functional email contact form integrated with Nodemailer.
*   **Data Protection:** Clear policy on data handling.
*   **Gallery:** Showcase of works with images and tags.

## Environment Variables

Create a `.env` file in the root directory and populate it with the following variables. Replace placeholders with your actual sensitive values and configurations.

```env
# Backend Environment Variables
# -----------------------------

# General
NODE_ENV=development # or production
PORT=10000
FRONTEND_URL=http://localhost:10000 # Change for production if different from backend host

# Database (Replace with your actual database connection string when implemented)
DATABASE_URL="your_database_connection_string_here"

# JWT Authentication (Replace with strong, unique keys)
JWT_SECRET="YOUR_VERY_STRONG_RANDOM_JWT_SECRET_KEY"
JWT_EXPIRE=365d

# Admin Credentials
# IMPORTANT: These ADMINX_PASSWORD_HASH fields MUST contain actual bcrypt hashes.
# Generate these hashes from your desired admin passwords using a bcrypt tool/script (see below).
ADMIN1_EMAIL=admin1@example.com
ADMIN1_NAME="Admin User One"
ADMIN1_PASSWORD_HASH="PLACEHOLDER_BCRYPT_HASH_FOR_ADMIN1" # e.g., $2b$10$somehashvalue..........

ADMIN2_EMAIL=admin2@example.com
ADMIN2_NAME="Admin User Two"
ADMIN2_PASSWORD_HASH="PLACEHOLDER_BCRYPT_HASH_FOR_ADMIN2"

ADMIN3_EMAIL=admin3@example.com
ADMIN3_NAME="Admin User Three"
ADMIN3_PASSWORD_HASH="PLACEHOLDER_BCRYPT_HASH_FOR_ADMIN3"

# Email Configuration (Use Gmail App Password for SMTP_PASS if using Gmail with 2FA)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587 # or 465 for SSL
SMTP_USER=twoem.website@gmail.com # Your Gmail account
SMTP_PASS="YOUR_GMAIL_APP_PASSWORD_HERE" # Your Gmail App Password
EMAIL_FROM_NAME="Twoem Online Productions"
EMAIL_FROM="Twoem Online Productions <twoem.website@gmail.com>" # Sender name and email
CONTACT_RECEIVER_EMAIL=twoemcyber@gmail.com # Email that receives contact form submissions
REPLY_TO_EMAIL=twoemcyber@gmail.com # Default Reply-To for emails sent by the system (e.g., contact form confirmation)

# Student Settings
DEFAULT_STUDENT_PASSWORD=Student@Twoem2025
FORCE_PASSWORD_CHANGE=true
PASSWORD_MIN_LENGTH=8

# Academic Settings
PASSING_GRADE=60

# Session Secret (if using express-session, replace with a strong secret)
SESSION_SECRET="YOUR_STRONG_SESSION_SECRET_FOR_EXPRESS_SESSION"
DEBUG=false # Set to true for more verbose logging if implemented
```

**Generating Admin Password Hashes:**
You *must* generate bcrypt hashes for your admin passwords. Plain text passwords will not work with the planned authentication system. You can do this with a simple Node.js script:

1.  Save the following as `generate-hash.js` in the project root:
    ```javascript
    // generate-hash.js
    const bcrypt = require('bcryptjs');
    const password = "yourChosenPassword"; // Replace with the actual password for an admin

    if (password === "yourChosenPassword") {
        console.log("Please replace 'yourChosenPassword' in the script with an actual password.");
        process.exit(1);
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log("\nCopy the generated hash and paste it into your .env file for the appropriate ADMINX_PASSWORD_HASH variable.");
    ```
2.  Ensure `bcryptjs` is installed (`npm install bcryptjs` or it's already a project dependency).
3.  Run the script: `node generate-hash.js`.
4.  Replace `"yourChosenPassword"` in the script with the desired password before running.
5.  Copy the output hash into your `.env` file for `ADMIN1_PASSWORD_HASH`, `ADMIN2_PASSWORD_HASH`, etc.

## Project Structure Highlights

```
/
├── public/                     # Static assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── src/                        # Source code
│   ├── controllers/            # Request handlers
│   ├── views/                  # EJS templates
│   │   ├── pages/              # Page-specific templates
│   │   └── partials/           # Reusable template partials (header, footer, etc.)
│   ├── routes/                 # Route definitions
│   ├── models/                 # Database models/schemas (to be added)
│   ├── services/               # Business logic (to be added)
│   ├── middleware/             # Custom middleware (e.g., auth) (to be added)
│   └── config/                 # Configuration files (e.g., mailer.js, database.js)
├── .env                        # Environment variables (MUST BE CREATED by user)
├── .gitignore                  # Specifies intentionally untracked files
├── package.json                # Project metadata and dependencies
├── server.js                   # Main application entry point
└── README.md                   # This file
```

## Setup and Running Locally

1.  **Clone the repository (if you haven't already).**
2.  **Navigate to the project directory:**
    ```bash
    cd path/to/twoem-online-productions
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Create and configure your `.env` file:**
    *   Copy `.env.example` (if provided in future) or create `.env` manually from the structure above.
    *   Fill in all required environment variables, especially `SMTP_USER`, `SMTP_PASS`, and generate/add `ADMINX_PASSWORD_HASH` values.
5.  **Start the server:**
    ```bash
    npm start
    ```
    The application should then be accessible at the URL specified by `FRONTEND_URL` and `PORT` (e.g., `http://localhost:10000` by default).

## Deployment (Example: Render.com)

*   Ensure your `package.json` has a `start` script: `"scripts": { "start": "node server.js", ... }`.
*   Render.com typically auto-detects Node.js projects.
*   Set all the required environment variables (from your `.env` file) in the Render.com service's environment settings dashboard. **Do not commit your `.env` file.**
*   Specify the Node.js version in Render settings if your project requires a specific one (e.g., via `engines` in `package.json` or Render's settings).
*   A database service (like Render Postgres) will need to be created and its connection URL used for `DATABASE_URL` in the environment variables on Render.
```
