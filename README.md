# ADVOCAT
**Next-Generation Legal Practice Management System**

![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge&logo=none)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-black?style=for-the-badge&logo=apple)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

---

## Executive Summary

**Advocat** is a high-performance, offline-first mobile application designed to modernize legal practice management. Engineered for seamless operation in courtrooms and chambers without reliable internet, it provides a secure, encrypted environment for case files, deadline management, and legal research. It natively supports the new Indian legal codes (BNS, BNSS, BSA) while maintaining backward compatibility with legacy acts (IPC, CrPC, IEA).

## Core Capabilities

### 1. Intelligent Case Management
Comprehensive lifecycle tracking from **Intake** to **Appeal**.
*   **Multi-Stage Tracking**: Granular status updates across 10+ distinct legal stages including Pleading, Discovery, and Trial.
*   **Legal Code Integration**: Built-in support for both new (BNS, BNSS) and legacy (IPC, CrPC) legal frameworks, allowing precise section validation.
*   **Timeline Visualization**: Automated chronological history of every case event, hearing, and document upload.

### 2. Smart Deadline Engine
A proactive scheduling system designed to prevent missed filings and court dates.
*   **Urgency Algorithms**: Automated classification of tasks into **Critical** (<3 days), **High** (<7 days), and **Medium** priorities.
*   **Custom Notification Logic**: Configurable alert triggers (Same Day, 24h, 72h, Custom) ensuring multi-layered reminders.
*   **Status Synchronization**: Real-time updates on deadline completion status across the application.

### 3. Secure Document Vault
Enterprise-grade document handling built on `expo-file-system`.
*   **Offline-First Storage**: Documents are stored locally and encrypted, ensuring accessibility without network connectivity.
*   **Version Control**: Track document history with revision support.
*   **Intelligent Sharing**: Secure sharing capabilities using `react-native-share` with automatic MIME-type detection and safe file naming.
*   **Backup & Restore**: Full JSON-based backup system comprising cases, documents (Base64 encoded), and setting configurations.

### 4. Legal Research & Analytics
*   **Performance Metrics**: Visual analytics via `react-native-chart-kit` tracking case loads and efficiency.
*   **Citation Library**: Structured database for managing legal precedents and research notes.

---

## Technical Architecture

The application is built on a **Clean Architecture** principle, separating concerns into robust layers for scalability and maintainability.

### Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Runtime** | **Expo (React Native)** | Cross-platform native performance with rapid iteration cycles. |
| **Language** | **TypeScript** | Strict static typing for mission-critical reliability. |
| **State Management** | **Zustand** | Lightweight, predictable state management without boilerplate. |
| **Persistence** | **AsyncStorage + Expo FS** | Hybrid storage strategy for relational data and binary assets. |
| **Navigation** | **React Navigation 7** | Deep linking support and native screen primitives. |
| **Utilities** | **Lodash / Day.js** | Optimized data manipulation and immutable date handling. |

### Project Structure

```text
src/
├── components/       # Reusable UI primitives (UrgencyBadge, GradientButton)
├── context/          # React Context providers (Toast, Theme)
├── data/             # Static legal data definitions
├── features/         # Domain logic (Urgency rules, Validation)
├── models/           # TypeScript interfaces (Case, Document, Deadline)
├── navigation/       # Stack and Tab navigators
├── screens/          # Feature-specific view controllers
├── services/         # External I/O (Storage, Notifications, Backup)
├── store/            # Global state stores (Zustand)
└── theme/            # Design system tokens (Colors, Typography)
```

---

## Installation & Setup

### Prerequisites
*   Node.js (v18 or higher)
*   npm or yarn
*   Expo Go (for mobile testing)

### Quick Start

1.  **Clone the Repository**
    ```bash
    git clone https://github.com/santhosh-reddy/advocat.git
    cd advocat
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    # or
    yarn install
    ```

3.  **Launch Development Environment**
    ```bash
    npx expo start
    ```

4.  **Run on Device**
    *   Scan the QR code with **Expo Go** (Android) or **Camera** (iOS).
    *   Press `a` to run on Android Emulator.
    *   Press `i` to run on iOS Simulator.

---

## Deployment

### Android Build
Generate a production-ready APK/AAB:
```bash
eas build --platform android --profile production
```

### iOS Build
Generate a production IPA:
```bash
eas build --platform ios --profile production
```

---

## Development Team

**Santhosh Reddy**
*Lead Developer & Software Architect*

Designed and engineered the core architecture, including the custom offline sync engine and legal compliance modules.

---

## License

This project is licensed under the **MIT License** - see the LICENSE file for details.

© 2024 Advocat using React Native & Expo.
