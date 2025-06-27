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
