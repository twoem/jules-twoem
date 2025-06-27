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


## Gallery Images (Placeholders)

The gallery page (`src/views/pages/gallery.ejs`) currently uses `via.placeholder.com` images directly in the template. As specific gallery images are decided:

| Placeholder Description       | Intended Location in Repo   | Title / Tags (Example)                    | Current Placeholder Source / Notes        |
| ----------------------------- | --------------------------- | ----------------------------------------- | ----------------------------------------- |
| Gallery Image 1               | `public/images/gallery/`    | "Service Image 1" / Printing, Design      | `https://via.placeholder.com/400x300.png?text=Service+Image+1` |
| Gallery Image 2               | `public/images/gallery/`    | "Computer Training" / Education, Students | `https://via.placeholder.com/400x300.png?text=Computer+Training` |
| *(As per gallery.ejs)*        |                             |                                           |                                           |

## Icons

*   **Service Icons:** To be sourced from [Feather Icons](https://feathericons.com/) or [Tabler Icons](https://tabler-icons.io/) and implemented directly in EJS templates (e.g., as SVG or using a font library if chosen). Specific icons per service will be decided during UI implementation of the Services page.

---

*This document should be updated whenever new images are added or placeholders are replaced.*
