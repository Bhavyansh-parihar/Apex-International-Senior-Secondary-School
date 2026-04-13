# Apex International School - Official Website

Welcome to the official repository of **Apex International School**. This project is a comprehensive, responsive, and cross-browser compatible website designed to showcase the school's excellence in education and provide a seamless management interface for school administrators.

## 🚀 Features

### Public Facing Website
- **Responsive Design**: Mobile-first approach ensuring a premium experience on smartphones, tablets, and desktops.
- **Dynamic Content Navigation**: Interactive home, about, academics, faculty, facilities, calendar, and contact pages.
- **Image Overlays & Micro-animations**: Premium aesthetics with smooth transitions and hover effects.
- **Real-time Updates**: Integration with Firebase Firestore for live news, events, and gallery updates.
- **WCAG Compliant**: Built with accessibility in mind, including high contrast and skip-to-content features.

### Advanced Admin Portal
- **Content Management System (CMS)**:
  - **Website Media**: Dynamically update the school logo, hero background, and about section images.
  - **News & Announcements**: Manage a real-time news ticker and featured news section.
  - **Event Calendar**: Add, edit, and categorize school events, holidays, and exams.
  - **Faculty Management**: Manage the teaching staff directory, including professional profiles and photographs.
  - **Photo Gallery**: Create and manage albums with high-quality photograph uploads.
- **Cloudinary Integration**: Fully integrated image management for fast, optimized asset delivery.
- **Firebase Security**: Robust authentication and Firestore-based data persistence.

## 🛠️ Technology Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+), Google Fonts.
- **Backend & Database**: Firebase (Authentication & Firestore).
- **Media Asset Management**: Cloudinary (Image Upload, Storage, and Transformation API).
- **Architecture**: Dynamic synchronization bridge (`website-sync.js`) for seamless data injection into static pages.

## 💻 Getting Started

### Local Setup
1. Clone the repository: `git clone <repo-url>`
2. Open `index.html` in any modern web browser or use a local development server like VS Code's "Live Server".
3. To access the admin panel, navigate to `/admin/index.html`.

### Configuration
Update the following configuration files for your specific environment:
- `js/firebase-config.js` (for Firestore project credentials)
- `admin/js/cloudinary-config.js` (for Cloudinary upload presets and cloud name)

## 📄 License
© 2026 Apex International School. All Rights Reserved.
This project is for internal school use and management.

---
*Empowering future leaders since 2026.*
