# Twoem Online Productions - Website

This is the official website for Twoem Online Productions, providing a range of digital services and an educational portal.

## Table of Contents

- [Project Overview](#project-overview)
- [Current Status & Features Implemented](#current-status--features-implemented)
  - [Admin Portal](#admin-portal)
  - [Student Portal](#student-portal)
  - [Public Pages](#public-pages)
  - [Core System Features](#core-system-features)
- [Pending Features](#pending-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup and Running Locally](#setup-and-running-locally)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration (`.env`)](#environment-configuration-env)
  - [Generating Admin Password Hashes](#generating-admin-password-hashes)
  - [Initializing the Database](#initializing-the-database)
  - [Running the Application](#running-the-application)
- [Local Testing Instructions](#local-testing-instructions)
  - [Admin Testing](#admin-testing)
  - [Student Testing](#student-testing)
- [Deployment (Render.com)](#deployment-rendercom)
- [Image Asset Tracking](#image-asset-tracking)

## Project Overview

The Twoem Online Productions website serves as a central hub for clients and students. It offers information about services, a secure student portal for accessing academic information and resources, and a comprehensive admin panel for managing all aspects of the site and its users.

Key functionalities include:
*   Public-facing pages detailing services, providing downloads, and showcasing a gallery.
*   Secure login and dashboards for both administrators and students.
*   Management of courses, student enrollments, academic records (marks, grades), and fees by admins.
*   Student access to their academic progress, fee statements, notifications, study resources, and certificates.
*   System for admins to create and manage site-wide or targeted notifications.
*   Management of downloadable documents with public/eulogy types and expiry logic.
*   Configuration of site settings like WiFi credentials.

## Current Status & Features Implemented

As of the latest update, the following features are functional:

### Admin Portal
*   **Authentication:** Secure login/logout for up to 3 admins defined in `.env`. Passwords are bcrypt-hashed. JWTs used for session management via HTTPOnly cookies.
*   **Dashboard:** Central dashboard with links to management sections. Displays logged-in admin's name.
*   **Student Management:**
    *   Register new students (name, email; system auto-generates registration number and assigns default password).
    *   View a list of all students (ID, RegNo, Name, Email, Status, Registered At, Last Login).
    *   View detailed information for individual students (personal info, NOK details if completed by student, academic summary, fee summary).
    *   Edit student's first name and email.
    *   Activate/Deactivate student accounts (`is_active` flag).
*   **Course Management (CRUD):**
    *   List, create, edit, and delete courses (name, description).
    *   Deletion is prevented if a course has active student enrollments.
*   **Enrollment Management:**
    *   For each student, view their currently enrolled courses.
    *   Enroll students in available courses.
    *   Unenroll students from courses.
*   **Academic Records Management:**
    *   Enter/edit coursework marks and main exam marks for each student enrollment.
    *   System automatically calculates and stores the final grade ('Pass'/'Fail' based on 30% coursework, 70% exam, and configurable `PASSING_GRADE`).
*   **Fee Management:**
    *   Log fee entries (charges or payments) for students, including description, amounts, date, payment method, and notes.
*   **Notification Management (CRUD):**
    *   Create notifications with title and message.
    *   Target notifications to: All Students, Specific Student (by ID), or Students in a Specific Course (by Course ID).
    *   List and delete existing notifications.
*   **Study Resource Management (CRUD):**
    *   Manage URL-based study resources (title, description, URL).
    *   Optionally link resources to specific courses.
    *   List, add, edit, and delete resources.
*   **WiFi Credentials Management:**
    *   Update WiFi Network Name (SSID), Password (stored as plaintext for student display), and usage Disclaimer. These are stored in the `site_settings` table.
*   **Downloadable Documents Management (CRUD):**
    *   Manage entries for public documents and eulogy documents.
    *   Fields: title, description, external file URL, type (public/eulogy).
    *   For eulogy documents, an expiry date can be set (defaults to 7 days from creation if not specified).
*   **Action Logging:** Most administrative actions (student registration, course CRUD, enrollments, marks updates, fee logging, settings changes, etc.) are logged to an `action_logs` table with details like admin ID, action type, description, and timestamp. Admins can view these logs.

### Student Portal
*   **Authentication:** Secure login/logout with Registration Number and password. JWTs used for session management.
*   **Initial Setup Flow (First Login):**
    *   Mandatory password change from the default password.
    *   Mandatory completion of Next of Kin information.
*   **Password Reset (Forgot Password):**
    *   Students can request a password reset using their registration number and email.
    *   A 6-digit OTP is sent to their registered email.
    *   Students can use the OTP to set a new password.
*   **Dashboard:** Central dashboard with links to portal sections. Displays student's name.
*   **View Academic Scores:** Students can view a detailed list of their enrolled courses, coursework marks, main exam marks, calculated total score, and final grade.
*   **View Fee Statement:** Students can view their transaction history (charges and payments) and their overall fee balance.
*   **Read Notifications:** Students can view notifications targeted at them (all, specific ID, or by enrolled course).
*   **Access Study Resources:** Students can view and access general study resources and those linked to their enrolled courses.
*   **View WiFi Credentials:** Students can view the WiFi SSID, (plaintext) password, and disclaimer set by the admin.
*   **Certificate Download (Placeholder):** Students can view a list of courses they have passed. If their fees are cleared, a link to "download" a basic HTML certificate for that course is available.

### Public Pages
*   **Homepage:** Basic structure.
*   **Services Page:** Displays service categories with icons. Dynamically lists course names and descriptions from the database under "Computer Education".
*   **Downloads Page:** Dynamically lists "Public Documents" and "Eulogy Documents" from the database. Eulogy documents are hidden if their expiry date (explicit or 7 days from creation) has passed.
*   **Contact Page:** Functional contact form that sends an email using Nodemailer (requires SMTP configuration in `.env`).
*   **Data Protection Page:** Static content.
*   **Gallery Page:** Static placeholders for images.
*   **Admin/Student Login Pages:** Structurally complete with relevant forms.

### Core System Features
*   **Database:** SQLite database initialized with tables for students, courses, enrollments, fees, notifications, study resources, site settings, downloadable documents, password reset tokens, and action logs.
*   **Templating:** EJS for server-side rendering with partials for common UI elements (header, navbar, footer, flash messages).
*   **Styling:** Bootstrap 5 (CDN) with custom CSS enhancements. Font Awesome for icons.
*   **Routing:** Express.js routing for all pages and API endpoints.
*   **Middleware:** For authentication (`authAdmin`, `authStudent`), static file serving, body parsing, cookie parsing, session management, and flash messages.
*   **Flash Messages:** Implemented using `express-session` and `connect-flash` for user feedback on actions.
*   **Environment Configuration:** Uses `.env` file for all sensitive and deployment-specific settings.
*   **Image Asset Tracking:** `Images.md` file to document image usage.

## Pending Features

The following key features are planned for future development:

*   **Admin Portal:**
    *   **Student Management:** More advanced editing (beyond name/email), admin-initiated password resets.
    *   **Backup Management:** Interface for noting/triggering manual database backups.
*   **Student Portal:**
    *   **Certificate Download:** Generation of actual PDF certificates.
    *   **Profile Updates:** Allow students to change their password and update Next of Kin info after the initial setup.
    *   **Notification Enhancements:** "Mark as read" functionality.
*   **Public Pages:**
    *   **Gallery Page:** Dynamic content, possibly with admin management.
    *   **Services Page:** More detailed content for each service category.
*   **General:**
    *   **Full Image Integration:** Replace all placeholders with high-quality, relevant images.
    *   **Advanced UI/UX Polish:** Further styling, responsiveness checks, custom error pages.
    *   **Automated Testing:** Implementation of unit and integration tests.
    *   **Email Templates:** Refactor email content (OTP, notifications) into EJS templates.
    *   **New Student Credential Retrieval:** Re-evaluate and implement the "New Student?" tab on the login page if deemed necessary.

## Technology Stack

*   **Backend:** Node.js, Express.js
*   **Database:** SQLite (for development; designed to be adaptable to others like PostgreSQL for production)
*   **Templating Engine:** EJS (Embedded JavaScript)
*   **Frontend Framework:** Bootstrap 5 (via CDN)
*   **Icons:** Font Awesome (via CDN)
*   **Authentication:** JWT (JSON Web Tokens) stored in HTTPOnly cookies, bcryptjs for password hashing.
*   **Email:** Nodemailer (with Gmail SMTP as default configuration)
*   **Session Management:** `express-session` (primarily for flash messages)
*   **Flash Messages:** `connect-flash`
*   **Input Validation:** `express-validator` (used in some admin forms)

## Project Structure

```
/
├── db/                         # SQLite database file will be stored here
├── public/                     # Static assets (CSS, JS, images)
│   ├── css/
│   ├── js/
│   └── images/
├── src/                        # Source code
│   ├── controllers/            # Request handlers for different modules
│   ├── views/                  # EJS templates
│   │   ├── pages/              # Page-specific templates (admin, student, public)
│   │   └── partials/           # Reusable template partials
│   ├── routes/                 # Route definitions
│   ├── middleware/             # Custom middleware (e.g., authentication)
│   └── config/                 # Configuration files (database.js, mailer.js)
├── .env                        # Environment variables (MUST BE CREATED by user)
├── .gitignore                  # Specifies intentionally untracked files
├── AGENTS.md                   # Instructions for AI agents working on this repo
├── Images.md                   # Tracks image assets and placeholders
├── package.json                # Project metadata and dependencies
├── server.js                   # Main application entry point
└── README.md                   # This file (you are here!)
```

## Setup and Running Locally

### Prerequisites
*   Node.js (v16.x or higher recommended)
*   npm (usually comes with Node.js)

### Installation
1.  **Clone the repository (if applicable).**
    ```bash
    # git clone <repository-url>
    # cd <repository-name>
    ```
2.  **Navigate to the project directory.**
3.  **Install dependencies:**
    ```bash
    npm install
    ```

### Environment Configuration (`.env`)
Create a `.env` file in the root directory of the project. Copy the structure below and fill in your specific values. **Never commit your `.env` file to version control.**

```env
# General Settings
NODE_ENV=development # 'production' when deployed
PORT=10000
FRONTEND_URL=http://localhost:10000 # Used by some parts of app, e.g. email links

# Database (SQLite is used by default, no URL needed for file-based)
# DATABASE_URL="your_postgres_or_mysql_connection_string" # Only if switching from SQLite

# JWT Authentication
JWT_SECRET="YOUR_VERY_STRONG_RANDOM_JWT_SECRET_KEY_HERE" # Important: Make this long and random
JWT_EXPIRE="1h" # How long tokens are valid (e.g., 1h, 7d, 365d)
JWT_EXPIRE_MS="3600000" # JWT_EXPIRE in milliseconds (for cookie maxAge), e.g., 1 hour = 3600000

# Admin Credentials (Up to 3 admins)
# Generate bcrypt hashes for passwords (see "Generating Admin Password Hashes" below)
ADMIN1_EMAIL=admin@example.com
ADMIN1_NAME="Main Admin"
ADMIN1_PASSWORD_HASH="YOUR_BCRYPT_HASH_FOR_ADMIN1_PASSWORD"

ADMIN2_EMAIL=
ADMIN2_NAME=
ADMIN2_PASSWORD_HASH=

ADMIN3_EMAIL=
ADMIN3_NAME=
ADMIN3_PASSWORD_HASH=

# Email Configuration (using Gmail SMTP requires "App Password")
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587 # or 465 for SSL
SMTP_USER=your.email@gmail.com # Your sending Gmail address
SMTP_PASS="YOUR_GMAIL_APP_PASSWORD_HERE" # Gmail App Password if 2FA is enabled
EMAIL_FROM_NAME="Twoem Online Productions"
EMAIL_FROM="Twoem Online Productions <your.email@gmail.com>" # Must match SMTP_USER or authorized sender
CONTACT_RECEIVER_EMAIL=your_contact_receiver@example.com # Where contact form submissions go
REPLY_TO_EMAIL=your_contact_receiver@example.com # Default Reply-To for contact form emails

# Student Settings
DEFAULT_STUDENT_PASSWORD=Student@Twoem2025
PASSWORD_MIN_LENGTH=8

# Academic Settings
PASSING_GRADE=60 # Percentage

# Session Secret (for express-session and connect-flash)
SESSION_SECRET="ANOTHER_VERY_STRONG_RANDOM_SECRET_KEY_HERE"

# Debugging (optional)
# DEBUG=true
```

### Generating Admin Password Hashes
Admin passwords **must** be stored as bcrypt hashes in the `.env` file.
1.  Save the following as `generate-hash.js` in the project root:
    ```javascript
    // generate-hash.js
    const bcrypt = require('bcryptjs');
    const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
    });

    readline.question('Enter password to hash: ', (password) => {
        if (!password) {
            console.error("Password cannot be empty.");
            readline.close();
            process.exit(1);
        }
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        console.log(`\nPassword: ${password}`);
        console.log(`Bcrypt Hash: ${hash}`);
        console.log("\nCopy the generated hash and paste it into your .env file for the appropriate ADMINX_PASSWORD_HASH variable.");
        readline.close();
    });
    ```
2.  Ensure `bcryptjs` is installed (it's a project dependency).
3.  Run the script from your project root: `node generate-hash.js`
4.  Enter the desired password when prompted.
5.  Copy the output hash into your `.env` file for `ADMIN1_PASSWORD_HASH`, etc.

### Initializing the Database
The SQLite database (`db/twoem_online.sqlite`) and its tables will be created automatically when the application starts for the first time if the `db` directory and file do not exist. The schema is defined in `src/config/database.js`.

### Running the Application
1.  Ensure your `.env` file is correctly configured.
2.  Start the server:
    ```bash
    npm start
    ```
3.  Open your web browser and navigate to `http://localhost:10000` (or the `PORT` you configured).

## Local Testing Instructions

### Admin Testing
1.  **Login:** Navigate to `/admin/login`. Use the email and password (the one you hashed) for `ADMIN1_EMAIL` from your `.env` file.
    *   *Expected:* Successful login redirects to `/admin/dashboard`.
2.  **Course Management:**
    *   From the dashboard, go to "Manage Courses".
    *   Add a new course. Test form validation.
    *   Edit the course.
    *   Delete the course (ensure no student enrollments exist for it if testing delete restriction).
3.  **Student Registration:**
    *   From dashboard, go to "Student Management" -> "Register New Student".
    *   Register a new student (e.g., `student1@example.com`, First Name: TestStudent1). Note the generated Registration Number.
4.  **Student Listing & View:**
    *   Go to "Manage Students". Verify the new student appears.
    *   Click "View" for the student. Check details.
5.  **Student Edit & Status:**
    *   From student list or view page, click "Edit". Change student's first name. Save. Verify change.
    *   Deactivate and then reactivate the student. Verify status changes in the list and on the view page.
6.  **Enrollment Management:**
    *   For the test student, go to "Manage Enrollments".
    *   Enroll the student in a course. Verify.
    *   Unenroll the student. Verify.
7.  **Marks Management:**
    *   Enroll the student in a course. Go to "Manage Enrollments", then click "Marks" for that enrollment.
    *   Enter coursework and exam marks. Save. Verify final grade calculation.
8.  **Fee Logging:**
    *   For the test student, go to "Log New Fee/Payment" (from student view page).
    *   Log a charge (e.g., "Tuition Fee", Charge: 5000, Payment: 0).
    *   Log a payment (e.g., "Payment for Tuition", Charge: 0, Payment: 2000).
    *   Verify these appear correctly on the student's view page fee summary.
9.  **Notifications, Study Resources, Downloads, WiFi Settings:** Test CRUD operations for each of these modules via their respective admin pages.
10. **Action Logs:** After performing various admin actions, go to "View Action Logs" to see if they are recorded.
11. **Logout:** Test admin logout.

### Student Testing
*Use the student registered by the admin (e.g., TestStudent1) and their default password (`Student@Twoem2025` or as set in `.env`).*

1.  **Login & Initial Setup:**
    *   Navigate to `/student/login`. Enter Registration Number and default password.
    *   *Expected:* Redirect to "Change Your Initial Password".
    *   Change password (test validation: incorrect default, weak new pass, mismatch, new same as default).
    *   *Expected:* Redirect to "Complete Your Profile - Next of Kin".
    *   Complete Next of Kin info.
    *   *Expected:* Redirect to `/student/dashboard`.
2.  **Dashboard & Navigation:**
    *   Verify dashboard links: View Academic Scores, My Certificates, Check Fees Balance, Read Notifications, Study Resources, View WiFi Credentials.
3.  **View Academics:** Check if courses enrolled by admin (and marks entered) appear correctly.
4.  **View Fees:** Check if fee entries logged by admin appear correctly with balance.
5.  **View Notifications:** If admin sent relevant notifications, check if they appear.
6.  **View Study Resources:** If admin added resources, check if they appear (general and course-specific).
7.  **View WiFi:** Check if WiFi details set by admin are displayed (with password toggle).
8.  **Certificate Page:** Navigate to "My Certificates". If eligible (course passed + fees cleared), a link to "download" the HTML certificate should appear. Test the download link.
9.  **Forgot Password:**
    *   Log out. On `/student/login`, use the "Forgot Password" tab.
    *   Enter student's Registration Number and Email.
    *   *Expected (if SMTP is configured):* Receive OTP email.
    *   Enter OTP and new password on the reset form. Test validations.
    *   Log in with the new password.
10. **Logout:** Test student logout.

## Deployment (Render.com)

*   Ensure your `package.json` has a correct `start` script: `"scripts": { "start": "node server.js", ... }`.
*   Render.com typically auto-detects Node.js projects.
*   **Environment Variables:** Set all required environment variables (from your `.env` structure) in the Render.com service's "Environment" settings dashboard. **Crucially, `NODE_ENV` should be set to `production`.**
*   **Database:**
    *   For SQLite (as used in development): Render supports persistent disk storage. You'll need to configure a "Disk" in your Render service settings with a mount path (e.g., `/data/db`). Then, update `src/config/database.js` to use this path when `NODE_ENV === 'production'`, e.g., `const dbPath = process.env.NODE_ENV === 'production' ? '/data/db/twoem_online.sqlite' : path.resolve(__dirname, '../../db/twoem_online.sqlite');`.
    *   Alternatively, for more robust production use, provision a managed database service like Render Postgres. Create a PostgreSQL database on Render, get its "Internal Connection String", and set that as the `DATABASE_URL` environment variable on Render. You'd then need to install the `pg` Node.js package (`npm install pg`) and update `src/config/database.js` to use PostgreSQL when `DATABASE_URL` is present.
*   **Node.js Version:** Specify your Node.js version in Render settings or via an `engines` field in `package.json` if your project requires a specific one.
*   **Build Command:** Typically `npm install` or `yarn`. Render usually handles this.
*   **Start Command:** `npm start` or `node server.js`.

## Image Asset Tracking
Refer to `Images.md` in the root of the repository for a list of key images, their intended placements, and sources/placeholders. This document should be updated as new images are integrated.
```
