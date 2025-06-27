using Node.js/Bun, Python, Ruby, Go, Rust, and Elixir, desing

Add best index to open very nicely and beautifully using the most modern cards and ui and locating all files in  best folders with best routes.
The website is Twoem Online Productions configuring them to read the env stictlu=y in root sice ill add the env once in onreder,com and testing loccally
Add images to the website and the ReadMe.md, let it be perfect
### ✅ **Final Website Description for Twoem Online**

---

#### 🔷 **Website Identity**

* **Title Prefix**: `Twoem | Page Title` (e.g., `Twoem | Home`)
* **Official Email (Sender)**: `twoem.website@gmail.com`
* **Contact Receiver Email**: `twoemcyber@gmail.com`
* **Reply-To Tag**: All replies go to `twoemcyber@gmail.com`
* **Favicon**: `favicon.ico` in root
* **Logo**: `logo.png` (used in navbar/footer)
* **Hosted Downloads**: External links only, defined inside the code

---

#### 🔷 **Website Tabs/Sections**

* Home
* Services
* Downloads
* Student Portal
* Admin Login
* Contact
* Data Protection
* Gallerly Page, To show beautiful images and tags of our works
* or any other relevant pages, 

---

#### 🔷 **Services Offered**

##### 🖨️ **Digital Printing**

* A4 & A3 Color Printing
* Black & White Printing
* Binding Services
* Business Cards
* Poster Printing
* Lamination

##### 🏛️ **Government Services**

* eCitizen Support
* NHIF Registration
* KRA Services
* ID Application
* Passport Services
* Birth Certificate Application

##### 🖥️ **Office Services**

* Typing Services
* Scanning & Copying
* CV Writing
* Document Editing
* Data Entry
* Translation (English & Swahili)

##### 🌐 **Internet Services**

* High-Speed WiFi
* Computer Access
* Email Setup
* Online Applications
* Social Media Setup
* File Downloads

##### 🎓 **Computer Education**

Courses offered under basic computer training:

1. Introduction to Computers
2. Keyboard Management
3. Microsoft Word
4. Microsoft Excel
5. Microsoft Publisher
6. Microsoft PowerPoint
7. Microsoft Access
8. Internet and Email
9. Main Exams – (35% Theory + 35% Practical)


 don't show gradings in the services part, but on student’s portals 
* **Coursework**: 30%
* **Main Exam**: 70%
* **Passing Grade**: 60%
* **Certificate Access**: Only if student clears fees & scores ≥ 60%

---

#### 🔷 **Downloads Page**

* Two Sections:

  * **Public Documents** (e.g., Curriculum Guides)
  * **Eulogy Documents** (Expire after 7 days)
* All download URLs are pasted **directly in code**, not uploaded via dashboard
* Admin uses external file hosting (Google Drive, Dropbox, etc.)
* Eulogy expires 7 days after upload
* Description and arrangements to be best
* 

---

#### 🔷 **Admin Portal**

* Admins login via `admin ID` or `email`
* Admin data (name, email, default password) is stored in `.env`
* Up to **three admins supported**
* Admin name shown in dashboard greeting (`Hello, <Admin Name>`)
* Admin sees which admin last updated student/fees
* Can:

  * Register new students
  * Reset student passwords
  * Send portal notifications
  * Manage courses, marks, and academic records
  * View/update fees, balances, and payment logs
  * Upload and manage study resources
  * Upload/change WiFi credentials & disclaimer
  * Upload backup file (manually or triggered)
  * View action logs per admin

---

#### 🔷 **Student Portal**

* Students log in via **Registration Number** and default password `Student@Twoem2025`
* Students must change password on first login
* Students must also fill in **Next of Kin** info after first login
* Can:

  * View academic scores
  * View/download certificate (and eligibility download)
  * Check fees balance and payment logs
  * Read notifications
  * View/download study resources
  * View WiFi credentials and policies

---

#### 🔷 **Contact Page**

* Integrated form
* Sends messages via `twoem.website@gmail.com`
* Auto forwards to `twoemcyber@gmail.com`
* Subject and message captured
* "Reply-To" automatically set to `twoemcyber@gmail.com`
* Configured using Gmail SMTP & App Password
* Add a perfectly working contact us form to send emails
* Add anything more to make this perfect

---

#### 🔷 **Image Usage**

* Icons/images sourced from **online/icon libraries**
* All required images are:

  * Logo → `logo.png`
  * Favicon → `favicon.ico`
* All icons for services rendered via a modern icon set (e.g., Feather Icons or Tabler Icons)
* Decorate the website perfectly with best images you can get
---

#### 🔷 **Environment Configuration (.env)**

> Private data like passwords/URLs stored in `.env` (not shown here)

Key Variables:

```env
# Backend Environment Variables
# -----------------------------

# General
NODE_ENV=production
PORT=10000
FRONTEND_URL=https://twoemcyberdemo2.onrender.com

# Database
DATABASE_URL=my database url will be here
# JWT Authentication
JWT_SECRET=REPLACE_WITH_YOUR_VERY_STRONG_RANDOM_JWT_SECRET_KEY
JWT_EXPIRE=365d

# Admin Credentials
ADMIN1_EMAIL=twoemcyber@gmail.com
ADMIN1_NAME="Twoem Online"
ADMIN1_PASSWORD_HASH="Adm@Twom2025"
ADMIN2_EMAIL=twoemcyber@gmail.com
ADMIN2_NAME="Twoem Online"
ADMIN2_PASSWORD="Adm@Twom2025"
ADMIN3_EMAIL=twoemcyber@gmail.com
ADMIN3_NAME="Twoem Online"
ADMIN3_PASSWORD_HASH="Adm@Twom2025"

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=twoem.website@gmail.com
SMTP_PASS="i will place my app password here"
EMAIL_FROM_NAME="Twoem Online Productions"
EMAIL_FROM="Twoem Online Productions <twoem.website@gmail.com>"
CONTACT_RECEIVER_EMAIL=twoemcyber@gmail.com

# Student Settings
DEFAULT_STUDENT_PASSWORD=Student@Twoem2025
FORCE_PASSWORD_CHANGE=true
PASSWORD_MIN_LENGTH=8

# Academic Settings
PASSING_GRADE=60

ADD MORE RELEVANT LIKE ADMINS DETAILS TO LOG IN AND NAMES
```

---

*Student Login Page Features* 
---

### 🔐 **Student Login Page Features**

The **Student Login Page** offers three distinct, intuitive options to support secure and user-friendly access for learners:

---

#### 1. ✅ **Login**

* Students log in using their:

  * **Registration Number** (provided by admin)
  * **Password** (default or updated)
* On first login:

  * Forced password change is required
  * Student is prompted to complete personal profile, including **Next of Kin** details

---

#### 2. 🔁 **Forgot Password**

* For students who forget their credentials:

  * Prompted to enter:

    * **Registration Number**
    * **Registered Email Address**
  * System verifies both details against student records
  * If valid, a **6-character One-Time Reset Code** is sent to their email
  * Student uses this code to reset their password securely

---

#### 3. 🆕 **New Student? (One-Time Login Credentials)**

* Allows students who’ve been registered by an admin but haven't received login details to retrieve them
* Student provides:

  * **Email Address**
  * **First Name**
* If verified:

  * The system displays their **One-Time Login Credentials** (Registration Number + Temporary Password)
  * These credentials are **usable only once** per email
  * After first login, student must update password and profile

---


use best codes deployable on Render.com and ensure all codes are present ans perfect with no error to avoid deployment issues on onrender
