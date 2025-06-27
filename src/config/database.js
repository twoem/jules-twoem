const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determine the database path. Store it in a 'db' directory in the project root.
const dbPath = path.resolve(__dirname, '../../db/twoem_online.sqlite');
const dbDir = path.resolve(__dirname, '../../db');

// Ensure db directory exists
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize the database
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        initializeDb();
    }
});

// Function to initialize tables
function initializeDb() {
    db.serialize(() => {
        // Students Table
        db.run(`
            CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                registration_number TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                first_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                next_of_kin_details TEXT,
                last_login_at DATETIME,
                requires_password_change BOOLEAN DEFAULT TRUE,
                is_profile_complete BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE NOT NULL, -- Added new column
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating students table:", err.message);
            else console.log("Students table checked/created.");
        });

        // Password Reset Tokens Table
        db.run(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                token_hash TEXT NOT NULL, -- Store hash of the OTP
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE DEFAULT FALSE, -- Ensure default is set
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error("Error creating password_reset_tokens table:", err.message);
            else console.log("Password_reset_tokens table checked/created.");
        });

        // Note: 'updated_at' timestamp for 'students' table will be handled by application logic
        // upon updates to ensure cross-database compatibility and simplify SQLite setup.

        // Courses Table
        db.run(`
            CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                -- Add image_url TEXT if courses have images
            )
        `, (err) => {
            if (err) console.error("Error creating courses table:", err.message);
            else console.log("Courses table checked/created.");
        });

        // Enrollments Table
        db.run(`
            CREATE TABLE IF NOT EXISTS enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                coursework_marks INTEGER,
                main_exam_marks INTEGER,
                final_grade TEXT, -- e.g., 'A', 'B', 'Pass', 'Fail'
                certificate_issued_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                UNIQUE(student_id, course_id) -- Student can only enroll in a course once
            )
        `, (err) => {
            if (err) console.error("Error creating enrollments table:", err.message);
            else console.log("Enrollments table checked/created.");
        });

        // Add is_active column to students table if it doesn't exist
        // This is a common way to handle schema changes in a simple setup.
        // First, check if the column exists.
        db.get("PRAGMA table_info(students)", (err, result) => {
            if (err) {
                console.error("Error fetching students table info:", err.message);
                return;
            }

            // The result of PRAGMA table_info is an array of objects if the table exists,
            // otherwise it might be undefined or throw an error earlier if table doesn't exist.
            // However, CREATE TABLE IF NOT EXISTS students runs before this.
            // PRAGMA table_info returns one row per column.
            // We need to query the result to see if 'is_active' is a column name.
            // This is complex to do directly here without async/await or promises for PRAGMA.

            // Simpler approach for SQLite: try to add column, ignore error if it already exists.
            // This is not perfectly robust as other errors might be ignored too.
            // A more robust way is to query pragma_table_info and check column names.
            // For now, let's try adding and then updating.
            db.run("ALTER TABLE students ADD COLUMN is_active BOOLEAN DEFAULT TRUE", (alterErr) => {
                if (alterErr) {
                    if (alterErr.message.includes("duplicate column name: is_active")) {
                        console.log("Column is_active already exists in students table.");
                    } else {
                        console.error("Error adding is_active column to students:", alterErr.message);
                    }
                } else {
                    console.log("Column is_active added to students table with DEFAULT TRUE.");
                    // For existing rows that might have gotten NULL before DEFAULT was effective (older SQLite)
                    // or if DEFAULT TRUE wasn't retroactive.
                    db.run("UPDATE students SET is_active = TRUE WHERE is_active IS NULL", (updateErr) => {
                        if (updateErr) console.error("Error updating existing students for is_active:", updateErr.message);
                        else console.log("Ensured existing students have is_active set to TRUE.");
                    });
                }
            });
        });


        // Fees Table
        db.run(`
            CREATE TABLE IF NOT EXISTS fees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                description TEXT NOT NULL, -- e.g., "Course Fee - MS Word", "Exam Fee"
                total_amount REAL NOT NULL,
                amount_paid REAL DEFAULT 0,
                payment_date DATETIME,
                payment_method TEXT, -- e.g., "Cash", "M-Pesa", "Bank Transfer"
                notes TEXT,
                logged_by_admin_id TEXT, -- Admin's ID (e.g., admin1, admin2 from .env) or email
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error("Error creating fees table:", err.message);
            else console.log("Fees table checked/created.");
        });

        // Notifications Table
        db.run(`
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                target_audience_type TEXT DEFAULT 'all' CHECK(target_audience_type IN ('all', 'student_id', 'course_id')),
                target_audience_identifier TEXT, -- Stores student_id or course_id if not 'all'
                created_by_admin_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                -- no updated_at, notifications are typically immutable once sent
            )
        `, (err) => {
            if (err) console.error("Error creating notifications table:", err.message);
            else console.log("Notifications table checked/created.");
        });

        // Study Resources Table
        db.run(`
            CREATE TABLE IF NOT EXISTS study_resources (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                resource_url TEXT NOT NULL, -- Could be external URL or path to local file
                course_id INTEGER, -- Optional: link resource to a specific course
                uploaded_by_admin_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
            )
        `, (err) => {
            if (err) console.error("Error creating study_resources table:", err.message);
            else console.log("Study_resources table checked/created.");
        });

        // Site Settings Table (for WiFi, etc.)
        db.run(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL, -- e.g., 'wifi_ssid', 'wifi_password', 'wifi_disclaimer'
                setting_value TEXT,
                description TEXT, -- Optional description of the setting
                updated_by_admin_id TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating site_settings table:", err.message);
            else console.log("Site_settings table checked/created.");
        });

        // Action Logs Table
        db.run(`
            CREATE TABLE IF NOT EXISTS action_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                admin_id TEXT NOT NULL, -- Admin's ID or email
                action_type TEXT NOT NULL, -- e.g., "STUDENT_REGISTERED", "COURSE_CREATED", "FEE_LOGGED"
                description TEXT, -- More details about the action
                target_entity_type TEXT, -- e.g., "student", "course"
                target_entity_id INTEGER,
                ip_address TEXT, -- Optional: IP address of admin
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Error creating action_logs table:", err.message);
            else console.log("Action_logs table checked/created.");
        });

        // Downloadable Documents Table
        db.run(`
            CREATE TABLE IF NOT EXISTS downloadable_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                file_url TEXT NOT NULL, -- Hardcoded URL as per spec
                type TEXT NOT NULL CHECK(type IN ('public', 'eulogy')),
                expiry_date DATETIME, -- NULL for public, set for eulogy
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                uploaded_by_admin_id TEXT NOT NULL -- Admin who configured this entry
            )
        `, (err) => {
            if (err) console.error("Error creating downloadable_documents table:", err.message);
            else console.log("Downloadable_documents table checked/created.");
        });

    });
}

// Promisify db.get, db.all, db.run for easier async/await usage
const util = require('util');
db.getAsync = util.promisify(db.get);
db.allAsync = util.promisify(db.all);
db.runAsync = util.promisify(db.run);


// Close the database connection when the application exits
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});

module.exports = db;
