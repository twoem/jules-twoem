const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs'); // Moved fs require to top

let dbPath;
let dbDir;

if (process.env.NODE_ENV === 'production') {
    // In production, expect DATABASE_FILE_PATH_PROD to be set, e.g., /data/db/twoem_online.sqlite
    // Render's persistent disks are typically mounted at /data/ or similar.
    dbPath = process.env.DATABASE_FILE_PATH_PROD || '/data/db/twoem_online.sqlite'; // Fallback for safety
    dbDir = path.dirname(dbPath);
    console.log(`Production mode: Using database path at ${dbPath}`);
} else {
    // Development: store it in a 'db' directory in the project root.
    dbDir = path.resolve(__dirname, '../../db');
    dbPath = path.join(dbDir, 'twoem_online.sqlite');
    console.log(`Development mode: Using database path at ${dbPath}`);
}

// Ensure db directory exists
if (!fs.existsSync(dbDir)) {
    try {
        fs.mkdirSync(dbDir, { recursive: true });
        console.log(`Created database directory: ${dbDir}`);
    } catch (dirErr) {
        console.error(`Error creating database directory ${dbDir}:`, dirErr);
        // Decide if to throw or let sqlite3 handle path error
    }
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
                second_name TEXT, -- Middle name, optional
                last_name TEXT NOT NULL,
                phone_number TEXT, -- Student's own phone number
                password_hash TEXT NOT NULL,
                next_of_kin_details TEXT,
                last_login_at DATETIME,
                requires_password_change BOOLEAN DEFAULT TRUE,
                is_profile_complete BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE NOT NULL,
                credentials_retrieved_once BOOLEAN DEFAULT FALSE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_updated_by_admin_id TEXT,
                last_updated_by_admin_name TEXT
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
                course_id INTEGER NOT NULL, -- Will typically be 1 for "Basic Computer Training"
                enrollment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
                average_unit_marks REAL,
                main_exam_theory_marks INTEGER CHECK(main_exam_theory_marks >= 0 AND main_exam_theory_marks <= 100),
                main_exam_practical_marks INTEGER CHECK(main_exam_practical_marks >= 0 AND main_exam_practical_marks <= 100),
                final_grade TEXT, -- e.g., 'Pass', 'Fail'
                certificate_issued_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
                UNIQUE(student_id, course_id)
            )
        `, (err) => {
            if (err) console.error("Error creating enrollments table:", err.message);
            else {
                console.log("Enrollments table checked/created.");
                // Add new columns to enrollments table if they don't exist
                const enrollmentColumnsToAdd = [
                    { name: 'average_unit_marks', type: 'REAL' },
                    { name: 'main_exam_theory_marks', type: 'INTEGER CHECK(main_exam_theory_marks >= 0 AND main_exam_theory_marks <= 100)' },
                    { name: 'main_exam_practical_marks', type: 'INTEGER CHECK(main_exam_practical_marks >= 0 AND main_exam_practical_marks <= 100)' }
                ];
                enrollmentColumnsToAdd.forEach(column => {
                    db.run(`ALTER TABLE enrollments ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
                        if (alterErr) {
                            if (alterErr.message.includes(`duplicate column name: ${column.name}`)) {
                                // console.log(`Column ${column.name} already exists in enrollments table.`);
                            } else {
                                console.error(`Error adding ${column.name} column to enrollments:`, alterErr.message);
                            }
                        } else {
                            console.log(`Column ${column.name} added to enrollments table.`);
                        }
                    });
                });
                // Note: Dropping old columns coursework_marks and main_exam_marks is complex in SQLite
                // and often requires recreating the table. For now, they will remain if the table existed,
                // but new logic will use the new columns.
            }
        });

        // Add columns if they don't exist (simple migration for students table)
        const columnsToAdd = [
            { name: 'is_active', type: 'BOOLEAN DEFAULT TRUE NOT NULL' },
            { name: 'credentials_retrieved_once', type: 'BOOLEAN DEFAULT FALSE NOT NULL' }
        ];

        columnsToAdd.forEach(column => {
            // Check if column exists - this is a bit verbose without a helper
            // A simpler but less robust way for dev is just to try adding and ignore "duplicate column" error.
            db.run(`ALTER TABLE students ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
                if (alterErr) {
                    if (alterErr.message.includes(`duplicate column name: ${column.name}`)) {
                        console.log(`Column ${column.name} already exists in students table.`);
                    } else {
                        console.error(`Error adding ${column.name} column to students:`, alterErr.message);
                    }
                } else {
                    console.log(`Column ${column.name} added to students table.`);
                    // If added a boolean with default, existing rows might get NULL initially in some SQLite versions.
                    // Update NULLs to the default value.
                    if (column.type.includes("DEFAULT TRUE")) {
                        db.run(`UPDATE students SET ${column.name} = TRUE WHERE ${column.name} IS NULL`, (updateErr) => {
                            if (updateErr) console.error(`Error updating existing students for ${column.name} (TRUE):`, updateErr.message);
                        });
                    } else if (column.type.includes("DEFAULT FALSE")) {
                         db.run(`UPDATE students SET ${column.name} = FALSE WHERE ${column.name} IS NULL`, (updateErr) => {
                            if (updateErr) console.error(`Error updating existing students for ${column.name} (FALSE):`, updateErr.message);
                        });
                    }
                }
            });
        });

        // Add columns to students table if they don't exist
        const studentColumnsToAdd = [
            { name: 'last_updated_by_admin_id', type: 'TEXT' },
            { name: 'last_updated_by_admin_name', type: 'TEXT' },
            { name: 'second_name', type: 'TEXT' },
            { name: 'last_name', type: 'TEXT' }, // Will be enforced as NOT NULL by application logic for new entries
            { name: 'phone_number', type: 'TEXT' }
        ];
        studentColumnsToAdd.forEach(column => {
            // For last_name, if we wanted to add NOT NULL with a default for existing rows:
            // let columnDefinition = column.type;
            // if (column.name === 'last_name') {
            //    columnDefinition = 'TEXT NOT NULL DEFAULT "Unknown"';
            //    db.run(`ALTER TABLE students ADD COLUMN ${column.name} ${columnDefinition}`, (alterErr) => { ... });
            //    db.run(`UPDATE students SET ${column.name} = first_name WHERE ${column.name} = "Unknown"`, (updateErr) => {}); // Example population
            // } else {
            //    db.run(`ALTER TABLE students ADD COLUMN ${column.name} ${column.type}`, (alterErr) => { ... });
            // }
            // For simplicity now, adding as TEXT and relying on app logic for NOT NULL on new/updates.
            db.run(`ALTER TABLE students ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
                if (alterErr) {
                    if (alterErr.message.includes(`duplicate column name: ${column.name}`)) {
                        // console.log(`Column ${column.name} already exists in students table.`);
                    } else {
                        console.error(`Error adding ${column.name} column to students:`, alterErr.message);
                    }
                } else {
                    console.log(`Column ${column.name} added to students table.`);
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
                logged_by_admin_name TEXT, -- Stores admin's name for easier display
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error("Error creating fees table:", err.message);
            else console.log("Fees table checked/created.");
        });

        // Add logged_by_admin_name to fees table if it doesn't exist
        db.run(`ALTER TABLE fees ADD COLUMN logged_by_admin_name TEXT`, (alterErr) => {
            if (alterErr) {
                if (alterErr.message.includes(`duplicate column name: logged_by_admin_name`)) {
                    // console.log(`Column logged_by_admin_name already exists in fees table.`);
                } else {
                    console.error(`Error adding logged_by_admin_name column to fees:`, alterErr.message);
                }
            } else {
                console.log(`Column logged_by_admin_name added to fees table.`);
            }
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

        // Student Notification Reads Table (for "Mark as Read" functionality)
        db.run(`
            CREATE TABLE IF NOT EXISTS student_notification_reads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                notification_id INTEGER NOT NULL,
                read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
                UNIQUE (student_id, notification_id)
            )
        `, (err) => {
            if (err) console.error("Error creating student_notification_reads table:", err.message);
            else console.log("Student_notification_reads table checked/created.");
        });

        // App Counters Table (for sequential registration numbers, etc.)
        db.run(`
            CREATE TABLE IF NOT EXISTS app_counters (
                counter_name TEXT PRIMARY KEY NOT NULL,
                current_value INTEGER NOT NULL DEFAULT 0
            )
        `, (err) => {
            if (err) {
                console.error("Error creating app_counters table:", err.message);
            } else {
                console.log("App_counters table checked/created.");
                // Initialize student_reg_suffix if not present
                db.run(`INSERT OR IGNORE INTO app_counters (counter_name, current_value) VALUES ('student_reg_suffix', 0)`, (initErr) => {
                    if (initErr) {
                        console.error("Error initializing student_reg_suffix in app_counters:", initErr.message);
                    } else {
                        // console.log("student_reg_suffix counter initialized if it wasn't present.");
                    }
                });
            }
        });

        // Units Table
        db.run(`
            CREATE TABLE IF NOT EXISTS units (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                unit_name TEXT NOT NULL UNIQUE,
                description TEXT, -- Optional
                FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.error("Error creating units table:", err.message);
            else {
                console.log("Units table checked/created.");
                // Pre-populate units for the main course (assuming course_id 1 is "Basic Computer Training")
                const unitsToInsert = [
                    { course_id: 1, unit_name: "Introduction to Computers" },
                    { course_id: 1, unit_name: "Keyboard Management" },
                    { course_id: 1, unit_name: "Microsoft Word" },
                    { course_id: 1, unit_name: "Microsoft Excel" },
                    { course_id: 1, unit_name: "Microsoft Publisher" },
                    { course_id: 1, unit_name: "Microsoft PowerPoint" },
                    { course_id: 1, unit_name: "Microsoft Access" },
                    { course_id: 1, unit_name: "Internet & Email" }
                ];
                // Ensure the main course "Basic Computer Training" exists with ID 1
                db.run(`INSERT OR IGNORE INTO courses (id, name, description) VALUES (1, 'Basic Computer Training', 'Comprehensive training on basic computer operations and Microsoft Office suite.')`, function(courseErr) {
                    if (courseErr) {
                        console.error("Error ensuring main course exists:", courseErr.message);
                    } else {
                        // console.log("Main course 'Basic Computer Training' ensured with ID 1. LastID:", this.lastID, "Changes:", this.changes);
                        unitsToInsert.forEach(unit => {
                            db.run(`INSERT OR IGNORE INTO units (course_id, unit_name, description) VALUES (?, ?, ?)`,
                                [unit.course_id, unit.unit_name, unit.description || null],
                                (unitErr) => {
                                    if (unitErr) console.error(`Error inserting unit ${unit.unit_name}:`, unitErr.message);
                                }
                            );
                        });
                    }
                });
            }
        });

        // Student Unit Marks Table
        db.run(`
            CREATE TABLE IF NOT EXISTS student_unit_marks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                enrollment_id INTEGER NOT NULL,
                unit_id INTEGER NOT NULL,
                marks INTEGER CHECK(marks >= 0 AND marks <= 100),
                logged_by_admin_id TEXT,
                logged_by_admin_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
                FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE CASCADE,
                UNIQUE(enrollment_id, unit_id)
            )
        `, (err) => {
            if (err) console.error("Error creating student_unit_marks table:", err.message);
            else console.log("Student_unit_marks table checked/created.");
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

module.exports = {
    db,
    getDbPath: () => dbPath // Expose the dbPath
};
