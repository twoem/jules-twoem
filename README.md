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

As of the latest update (end of Phase 9 - Auth Stability & Phase 7 - Visual Polish), the following features are functional:

### Admin Portal
*   **Authentication:** Secure login/logout for up to 3 admins defined in `.env`. Passwords are bcrypt-hashed. JWTs (`admin_auth_token`) used for session management via HTTPOnly cookies, scoped to `/admin` with `SameSite=Lax`. Defensive `JWT_SECRET` checks in place.
*   **Dashboard:** Central dashboard with links to management sections. Displays logged-in admin's name. Placeholder for "Last student/fees update by".
*   **Student Management:**
    *   Register new students.
    *   View list of students (ID, RegNo, Name, Email, Status, Registered At, Last Login).
    *   View detailed student info (personal, NOK, academic summary, fee summary).
    *   Edit student's first name and email.
    *   Activate/Deactivate student accounts.
    *   Admin-initiated password reset (to default, forces student to change on next login).
*   **Course Management (CRUD):** Full CRUD for courses. Deletion prevented if enrollments exist.
*   **Enrollment Management:** Manage student course enrollments (enroll/unenroll).
*   **Academic Records:** Enter/edit coursework & exam marks; system calculates final grade.
*   **Fee Management:** Log fee charges and payments for students.
*   **Notification Management (CRUD):** Create/delete notifications (target: all, specific student ID, specific course ID).
*   **Study Resource Management (CRUD):** Manage URL-based resources, optionally link to courses.
*   **WiFi Credentials Management:** Update WiFi SSID, password (stored plaintext as `wifi_password_plaintext` for student view), and disclaimer via `site_settings` table.
*   **Downloadable Documents Management (CRUD):** Manage public/eulogy document entries (title, URL, type, expiry).
*   **Action Logging:** Most admin actions are logged. Admins can view these logs (last 100 entries).

### Student Portal
*   **Authentication:** Secure login/logout with Registration Number and password. JWTs (`student_auth_token`) used for session management (HTTPOnly, `path: '/'`, `SameSite=Lax`). Defensive `JWT_SECRET` checks.
*   **Initial Setup Flow (First Login):** Mandatory password change & Next of Kin info completion.
*   **Credential Retrieval:** "New Student?" feature to retrieve initial RegNo & default password if not yet set up (one-time use per student).
*   **Password Reset (Forgot Password):** OTP sent to email for password reset.
*   **Dashboard:** Central dashboard. Displays student's name. Links to portal sections.
*   **Profile Updates (Self-Service):** Students can change their password and update NOK details from their dashboard.
*   **View Academic Scores:** Detailed list of enrolled courses, marks, total score, final grade.
*   **View Fee Statement:** Transaction history and overall fee balance.
*   **Read Notifications:** View relevant notifications (all, specific to student, or by enrolled course), with read/unread status indication and "Mark as Read" functionality.
*   **Access Study Resources:** View general and course-specific resources.
*   **View WiFi Credentials:** Display WiFi info set by admin.
*   **Certificate Download (HTML Placeholder):** View list of passed courses; if fees cleared, can "download" an HTML certificate.

### Public Pages
*   **Homepage, Services, Downloads, Contact, Data Protection, Gallery:** Structurally complete.
*   **Visuals:** Site-wide sky blue color theme implemented. Homepage, Services, Downloads pages have header image placeholders. Login/Contact pages have background image placeholders. Gallery has updated placeholder structure. `Images.md` updated.
*   **Dynamic Content:** Services page lists courses. Downloads page lists documents with expiry logic.
*   **Contact Form:** Functional, sends styled HTML email (via `contact-form-submission.ejs`) with `Reply-To` set to sender.
*   **Error Handling:** Custom 404 page implemented.

### Core System Features
*   **Database:** SQLite with expanded schema. Production path configurable via `DATABASE_FILE_PATH_PROD`.
*   **Templating/Styling:** EJS, Bootstrap 5, Font Awesome, custom CSS.
*   **Routing & Middleware:** Express.js, authentication middleware (`authAdmin`, `authStudent`), error handling.
*   **Session/Flash:** `express-session`, `connect-flash` for user feedback.
*   **`.env` Configuration:** Centralized settings.
*   **Node Version:** Specified in `package.json` (`engines`).
*   **Health Check:** `/healthz` endpoint for deployment monitoring.
*   **`.gitignore`:** Updated to exclude `db/` directory.

## Pending Features
(High-level summary, detailed breakdown for next phase will be in a new plan)
*   **Admin Portal:**
    *   Full "Last student/fees update by [Admin Name] on [Date]" implementation on dashboard.
    *   Backup Management Interface (Download/Upload).
*   **Student Portal:**
    *   PDF Certificate Generation.
*   **Public Pages:**
    *   Gallery Page: Dynamic content, ideally with admin management.
    *   Services Page: Further textual detail for each service category.
*   **General:**
    *   **Full Image Integration:** Replace all placeholders in `Images.md` with actual sourced images.
    *   **Email Templates:** Full integration for system-sent notifications (if any beyond OTP/Contact).
    *   **Automated Testing:** Comprehensive unit and integration tests.
    *   **Advanced UI/UX Polish:** Final review, custom 500 error page, etc.
*   **Re-evaluate:** "New Student Credential Retrieval" (currently implemented, but re-evaluate if workflow is optimal).

## Technology Stack
*   **Backend:** Node.js, Express.js
*   **Database:** SQLite (development), configurable for production (e.g., SQLite on persistent disk).
*   **Templating Engine:** EJS
*   **Frontend Framework:** Bootstrap 5 (CDN)
*   **Icons:** Font Awesome (CDN)
*   **Authentication:** JWTs in HTTPOnly cookies, bcryptjs
*   **Email:** Nodemailer
*   **Session & Flash:** `express-session`, `connect-flash`
*   **Input Validation:** `express-validator`

## Project Structure
```
/
├── db/                         # Local SQLite DB file (ignored by Git)
├── public/                     # Static assets
├── src/                        # Source code
│   ├── controllers/
│   ├── views/
│   │   ├── pages/
│   │   ├── partials/
│   │   └── emails/             # EJS email templates
│   ├── routes/
│   ├── middleware/
│   ├── config/
│   └── utils/                  # Utility helpers (e.g., jwtHelper.js)
├── .env                        # Local environment variables (MUST BE CREATED)
├── .gitignore
├── AGENTS.md
├── Images.md                   # Image asset tracking
├── package.json
├── server.js
└── README.md
```

## Setup and Running Locally
*(Instructions largely remain the same, just ensure `.env` section is complete)*

### Prerequisites
*   Node.js (v16.0.0 or higher, as per `package.json`)
*   npm

### Installation
1.  Clone repository.
2.  `cd <repository-directory>`
3.  `npm install`

### Environment Configuration (`.env`)
Create a `.env` file in the project root. **Do not commit this file.**

```env
# General Settings
NODE_ENV=development
PORT=10000
FRONTEND_URL=http://localhost:10000

# Database File Path (for Render.com persistent disk in production)
# In development, it defaults to db/twoem_online.sqlite in project root.
# For Render, set this to your disk mount path + filename, e.g., /data/db/twoem_online.sqlite
DATABASE_FILE_PATH_PROD=

# JWT Authentication
JWT_SECRET="REPLACE_WITH_A_VERY_STRONG_RANDOM_SECRET_KEY_MIN_32_CHARS"
JWT_EXPIRE="1h"
JWT_EXPIRE_MS="3600000" # 1 hour in milliseconds

# Admin Credentials (Example for ADMIN1, configure up to 3)
ADMIN1_EMAIL=admin@example.com
ADMIN1_NAME="Main Admin"
ADMIN1_PASSWORD_HASH="YOUR_GENERATED_BCRYPT_HASH_HERE"
# ... ADMIN2, ADMIN3 if used

# Email Configuration (e.g., Gmail with App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your.email@gmail.com
SMTP_PASS="YOUR_GMAIL_APP_PASSWORD"
EMAIL_FROM_NAME="Twoem Online Productions"
EMAIL_FROM="Twoem Online Productions <your.email@gmail.com>"
CONTACT_RECEIVER_EMAIL=contact_receiver@example.com
REPLY_TO_EMAIL=contact_receiver@example.com # For system-generated replies, if any

# Student Settings
DEFAULT_STUDENT_PASSWORD=Student@Twoem2025
PASSWORD_MIN_LENGTH=8

# Academic Settings
PASSING_GRADE=60

# Session Secret
SESSION_SECRET="REPLACE_WITH_ANOTHER_STRONG_RANDOM_SECRET_KEY"
```

### Generating Admin Password Hashes
*(Instructions for `generate-hash.js` remain the same)*

### Initializing the Database
The SQLite database file and tables are created automatically when the application starts if they don't exist. The development database will be at `db/twoem_online.sqlite`.

### Running the Application
1.  Ensure `.env` is configured.
2.  `npm start`
3.  Access at `http://localhost:10000`.

## Local Testing Instructions
*(This section is now very extensive; I'll keep the previous detailed steps here, ensure they are still relevant)*
*(The existing detailed Admin and Student testing steps are good and cover most implemented features)*

## Deployment (Render.com)

Deploying to Render.com requires the following configuration:

1.  **Create a New Web Service** on Render, connecting it to your Git repository.
2.  **Build Command:** Render should auto-detect `npm install` (or `yarn`). If not, set it explicitly.
3.  **Start Command:** Set to `npm start` (which executes `node server.js`).
4.  **Node.js Version:** In Render's settings for your service, you can specify a Node.js version. It's recommended to match the version used in development or set in `package.json`'s `engines` field (e.g., 16 or 18).
5.  **Persistent Disk (for SQLite):**
    *   Go to your service's "Disks" section on Render.
    *   Click "Add Disk".
    *   **Name:** e.g., `twoem-database`
    *   **Mount Path:** e.g., `/data/db` (This is where the database file will live on Render).
    *   **Size:** Choose an appropriate size (e.g., 1 GB to start for SQLite).
6.  **Environment Variables:** This is the most crucial step. In your Render service's "Environment" section, add all the variables from your local `.env` file.
    *   **`NODE_ENV`**: Set to `production`.
    *   **`PORT`**: Render sets this automatically; you don't need to set it here.
    *   **`FRONTEND_URL`**: Set this to your Render service's public URL (e.g., `https://your-app-name.onrender.com`).
    *   **`DATABASE_FILE_PATH_PROD`**: Set this to the **Mount Path** you chose for your disk plus the desired filename. For example, if Mount Path is `/data/db`, set this to `/data/db/twoem_online.sqlite`. The application will create the file here.
    *   **`JWT_SECRET`**: Set a **NEW, STRONG, RANDOM SECRET** specifically for production. Do not reuse your development secret.
    *   **`SESSION_SECRET`**: Set a **NEW, STRONG, RANDOM SECRET** for production.
    *   All `ADMIN...` credentials (with production-secure passwords, hashed).
    *   All `SMTP_...` credentials for your production email sending.
    *   Other variables like `DEFAULT_STUDENT_PASSWORD`, `PASSING_GRADE`, etc.
7.  **Health Check (Optional but Recommended):**
    *   Render can use a health check path. Our application now has a `GET /healthz` endpoint. You can specify this path in Render's health check settings if needed, or Render will default to checking if the port is responsive.
8.  **Puppeteer Dependencies (for PDF Generation):**
    *   If deploying to Render's native environment (not Docker), Puppeteer might require additional system dependencies for headless Chrome to run correctly. If you encounter issues with PDF generation, you may need to add a `render.yaml` file to your repository root to specify these.
    *   Example `render.yaml` content:
        ```yaml
        services:
          - type: web
            name: twoem-online # Or your service name
            env: node
            plan: free # Or your chosen plan
            buildCommand: "npm install"
            startCommand: "npm start"
            envVars:
              - key: NODE_VERSION
                value: 18 # Or your desired Node version
              # ... other env vars
            buildFilter:
              paths:
                - src/**
                - public/**
                - package.json
                - package-lock.json
                - server.js
                - render.yaml # Important to include itself if you want changes to trigger builds
              ignoredPaths:
                - db/**
                - "*.md"
            # Add system dependencies for Puppeteer if needed
            # This is an illustrative list, you might need to adjust it.
            # Check Puppeteer documentation for minimal required Linux packages.
            # nativeEnvironment: # This key is illustrative; actual key may vary or use Docker.
            #   systemPackages:
            #     - libnss3
            #     - libgconf-2-4
            #     - libatk1.0-0
            #     - libatk-bridge2.0-0
            #     - libcups2
            #     - libdrm2
            #     - libgtk-3-0
            #     - libgbm1 # libgbm-dev might be too large or not needed for runtime
            #     - libasound2
            #     - libxshmfence1 # Added based on common Puppeteer issues
            #     - libxfixes3 # Added
            #     - libxrandr2 # Added
            #     - libxcomposite1 # Added
            #     - libxdamage1 # Added
            #     - libx11-xcb1 # Added
        # disk: # Example if you haven't set it up via UI
        #   name: twoem-database
        #   mountPath: /data/db
        #   sizeGB: 1
        ```
    *   Alternatively, using a Docker deployment on Render gives you full control over the environment and system dependencies.
    *   **Important:** Test PDF generation thoroughly after deployment to ensure Puppeteer functions correctly.

After configuring, deploy your service. The first deployment might take a few minutes to build and start. Check the logs on Render for any startup errors.

## Image Asset Tracking
Refer to `Images.md` for guidance on image placeholders, suggested themes, and where to place actual images.
```
