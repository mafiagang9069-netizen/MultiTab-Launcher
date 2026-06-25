# MultiTab Launcher 🚀

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

MultiTab Launcher is a high-performance, developer-focused React utility that lets you organize, schedule, and launch multiple URLs across dozens of browser tabs or windows simultaneously. Featuring a sleek, glassmorphic dark-mode dashboard, it serves as the ultimate workspace automation tool and popup-blocker stress tester.

---

## ✨ Key Features

- **🚀 Instant Mass Launching**: Queue and launch hundreds of URLs sequentially or all at once with custom delays and popup capability detection.
- **📊 Real-time Monitoring**: A compact analytics bar that tracks successfully opened tabs, remaining items, progress percentages, and browser-blocked popups.
- **📁 Workspaces & Profiles**: Organize collections of URLs into distinct profiles (e.g., *Development*, *Production*, *Social*) and save checkpoints.
- **🕒 Session History & Audits**: Access detailed logs of previous launches, execution speeds, and session statistics.
- **🛡️ Security Validation**: Automatically checks and sanitizes URL schemes to guarantee only safe HTTP/HTTPS requests are triggered.
- **🎨 Automated Branding System**: A custom build-time Vite plugin that automatically extracts your brand asset (`public/logo.png`), processes it headlessly via Chromium/Edge, compiles a multi-resolution `favicon.ico`, generates all PWA/Apple icons, and injects cache-busted metadata tags dynamically on build or change.

---

## 🛠️ Tech Stack

- **Framework**: [React 18](https://reactjs.org/) (with lazy-loaded views and error boundaries)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [PostCSS](https://postcss.org/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/) (smooth transitions, slide drawers, and modular loaders)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Bundler & Server**: [Vite](https://vitejs.dev/) (featuring hot module reloading and optimized production compiles)

---

## ⚙️ Automated Favicon Pipeline

This project includes a fully hands-off favicon and branding manager inside `vite-plugin-favicon.js`.

1. **Detection**: Looks for a single master logo asset (`public/logo.svg` or `public/logo.png`).
2. **Headless Compiling**: Spawns Microsoft Edge/Chrome in headless mode to render and screenshot the logo at all standard sizes (`16x16`, `32x32`, `180x180`, `192x192`, `512x512`).
3. **ICO Generation**: Runs a custom buffer packer that compiles the `16x16` and `32x32` PNGs into a standard multi-resolution `favicon.ico` binary.
4. **HTML Injection**: Inject metadata tags (`theme-color`, `application-name`, `mobile-web-app-capable`, `apple-mobile-web-app-capable`) and cache-busted paths (`?v=[hash]`) dynamically into `<head>`.
5. **Manifest Auto-Updates**: Overwrites `manifest.json` icons dynamically to ensure PWAs are correctly branded on any device.

---

## 🚀 Getting Started

### Prerequisites

You need [Node.js](https://nodejs.org/) installed on your machine.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/mafiagang9069-netizen/MultiTab-Launcher.git
   cd MultiTab-Launcher
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Scripts

- **Run local development server**:
  ```bash
  npm run dev
  ```
- **Compile production build**:
  ```bash
  npm run build
  ```
- **Preview local production build**:
  ```bash
  npm run preview
  ```

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
