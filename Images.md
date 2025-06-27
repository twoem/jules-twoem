# Website Image Asset Register

This document lists the key images used throughout the Twoem Online Productions website, their locations, and their purpose. This helps in managing visual assets and identifying placeholders.

## Core UI Images

| Filename / Placeholder        | Location in Repo        | Page(s) Used             | Purpose                                   | Notes                                     |
| ----------------------------- | ----------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------- |
| `logo.png`                    | `public/logo.png`       | Navbar, Footer (planned) | Main website logo                         | Replace with actual logo file             |
| `favicon.ico`                 | `public/favicon.ico`    | Browser Tab / Bookmarks  | Website favicon                           | Replace with actual favicon file          |

## Decorative & Illustrative Images (Placeholders)

This section will be populated as images are added to specific pages.

| Placeholder Description       | Intended Location in Repo | Page(s) / Section        | Purpose                                   | Current Placeholder Source / Notes        |
| ----------------------------- | ------------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------- |
| Homepage Hero Banner          | `public/images/home/`     | Home                     | Main welcoming visual for homepage        | e.g., `via.placeholder.com/1200x400`      |
| Service: Digital Printing     | `public/images/services/` | Services                 | Visual for Digital Printing section       | e.g., `via.placeholder.com/400x300`       |
| Service: Government Services  | `public/images/services/` | Services                 | Visual for Government Services section    | e.g., `via.placeholder.com/400x300`       |
| Service: Office Services      | `public/images/services/` | Services                 | Visual for Office Services section        | e.g., `via.placeholder.com/400x300`       |
| Service: Internet Services    | `public/images/services/` | Services                 | Visual for Internet Services section      | e.g., `via.placeholder.com/400x300`       |
| Service: Computer Education   | `public/images/services/` | Services                 | Visual for Computer Education section     | e.g., `via.placeholder.com/400x300`       |
| *(More to be added)*          |                           |                          |                                           |                                           |


## Gallery Images (Placeholders & Themes)

The gallery page (`src/views/pages/gallery.ejs`) uses placeholder images. These should be replaced with actual photos. The current placeholders and their intended themes are:

| Placeholder URL (Example)                            | Conceptual Theme                   | Title Example                      | Tags Example                             | Notes for Sourcing Real Images (e.g., from Unsplash/Pexels) | Intended Location in Repo |
| ---------------------------------------------------- | ---------------------------------- | ---------------------------------- | ---------------------------------------- | ----------------------------------------------------------- | ------------------------- |
| `https://via.placeholder.com/400x300.png?text=Quality+Prints` | Quality Printing                   | Quality Printing Solutions         | Printing, Design, Brochures              | Search for "modern printing", "brochure design", "quality flyers" | `public/images/gallery/`  |
| `https://via.placeholder.com/400x300.png?text=Computer+Class`  | Computer Education in action       | Empowering Through Education       | Education, Computer Skills, Community    | Search for "computer class Kenya", "adult education technology" | `public/images/gallery/`  |
| `https://via.placeholder.com/400x300.png?text=Office+Support`  | Office Services / Support          | Efficient Office Services          | Office Support, CV Writing, Productivity | Search for "professional resume", "office assistance"       | `public/images/gallery/`  |
| `https://via.placeholder.com/400x300.png?text=Fast+Internet`   | Internet Cafe / Connectivity       | Reliable Internet Access           | Internet, WiFi, Connectivity             | Search for "internet cafe", "people using wifi"             | `public/images/gallery/`  |
| `https://via.placeholder.com/400x300.png?text=Gov+Service+Help`| Government Service Assistance      | Government Service Assistance      | eCitizen, Support, KRA                   | Search for "community support", "online services Kenya"     | `public/images/gallery/`  |
| `https://via.placeholder.com/400x300.png?text=Twoem+Teamwork`  | Team or Service Interaction        | Dedicated to Our Community         | Team, Service, Twoem                     | Search for "friendly customer service", "local business team" | `public/images/gallery/`  |

## Icons

*   **Service Category Icons (Services Page - `services.ejs`):**
    *   Digital Printing: `fas fa-print`
    *   Government Services: `fas fa-landmark`
    *   Office Services: `fas fa-briefcase`
    *   Internet Services: `fas fa-wifi`
    *   Computer Education: `fas fa-laptop-code` (general), `fas fa-graduation-cap` (section title)
*   **CRUD Actions (Admin - e.g., `admin/courses/index.ejs`):**
    *   Add New: `fas fa-plus` (or `fa-user-plus` for students)
    *   Edit: `fas fa-edit`
    *   Delete: `fas fa-trash-alt`
    *   View Details: `fas fa-eye`
    *   Reset Password (planned): `fas fa-key`
*   **Document Type Icons:** For Downloads page, icons representing PDF, DOC, etc. might be used (e.g., `fas fa-file-pdf`, `fas fa-file-word`).

## Decorative & Illustrative Images (Placeholders & Ideas)

| Placeholder Description           | Intended Location in Repo     | Page(s) / Section        | Purpose                                       | Current Placeholder Source / Notes        |
| --------------------------------- | ----------------------------- | ------------------------ | --------------------------------------------- | ----------------------------------------- |
| Homepage Hero Banner              | `public/images/home/hero-placeholder.jpg` | Home           | Main welcoming visual for homepage            | Generic placeholder. Source from Unsplash/Pexels (e.g., "community technology center", "modern office services") |
| Service: Digital Printing         | `public/images/services/`     | Services (details page)  | Visual for Digital Printing section/details   | Unsplash search: "printing press", "brochures" |
| Service: Government Services      | `public/images/services/`     | Services (details page)  | Visual for Government Services section        | Unsplash search: "official document", "government building" |
| Service: Office Services          | `public/images/services/`     | Services (details page)  | Visual for Office Services section            | Unsplash search: "office work", "typing"  |
| Service: Internet Services        | `public/images/services/`     | Services (details page)  | Visual for Internet Services section          | Unsplash search: "wifi router", "people using laptops" |
| Service: Computer Education       | `public/images/services/`     | Services (details page or section header) | Visual for Computer Education section     | Unsplash search: "computer class", "students learning" |
| *(More to be added)*              |                               |                          |                                               |                                           |


## Potential Future Image Locations (Related to New DB Entities)

This section outlines areas where images might be incorporated as features are built for the new database entities.

| Feature / Entity        | Potential Image Use                     | Intended Location in Repo     | Notes                                     |
| ----------------------- | --------------------------------------- | ----------------------------- | ----------------------------------------- |
| Courses                 | Representative image for each course    | `public/images/courses/`      | Optional; if courses have visual branding |
| Study Resources         | Thumbnails for video links, document previews | (External or generated)       | If resource type is visual              |
| Student Certificates    | Template background/seal for certificates | `public/images/templates/`    | For certificate generation                |
| User Avatars (Admin/Student) | Profile pictures                     | `public/images/avatars/`      | Optional future enhancement               |


---

*This document should be updated whenever new images are added or placeholders are replaced.*
