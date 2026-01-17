![ADVOCAT](assets/header.svg)
**Next-Generation Legal Practice Management System**

![Version](https://img.shields.io/badge/version-2.0.0-0052CC?style=for-the-badge&logo=none)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-black?style=for-the-badge&logo=apple)
![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge)

---

## Executive Summary

**Advocat** is a high-performance, offline-first mobile application designed to modernize legal practice management. Engineered for seamless operation in courtrooms and chambers without reliable internet, it provides a secure, encrypted environment for case files, deadline management, and legal research. It natively supports the new Indian legal codes (BNS, BNSS, BSA) while maintaining backward compatibility with legacy acts (IPC, CrPC, IEA).

### Technical Architecture

The application is built on a **Clean Architecture** principle, separating concerns into robust layers for scalability and maintainability.

```mermaid
graph TD
    UI[User Interface] --> Features[Feature Layer]
    Features --> Store["State Management (Zustand)"]
    Features --> Services[Service Layer]
    
    subgraph Data Persistence
    Services --> Async["AsyncStorage (JSON)"]
    Services --> FS["Expo FileSystem (Binary)"]
    end
    
    subgraph External
    Services --> Share[Share Intent]
    Services --> Notif[Notifications]
    end

    style UI fill:#e1f5fe,stroke:#01579b
    style Features fill:#fff9c4,stroke:#fbc02d
    style Services fill:#e8f5e9,stroke:#2e7d32
    style Store fill:#f3e5f5,stroke:#7b1fa2
```

## Technology Stack

The application uses a modern, type-safe stack designed for scalability and performance.

| Category | Technology | Architecture Decision |
| :--- | :--- | :--- |
| **Core Framework** | ![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) | Chosen for native performance and cross-platform code sharing (~95%). |
| **Runtime** | ![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white) | Managed workflow for rapid OTA updates and simplified build pipelines. |
| **Language** | ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) | Enforces strict type safety to prevent runtime errors in critical legal contexts. |
| **State** | ![Zustand](https://img.shields.io/badge/Zustand-20232A?style=for-the-badge&logo=react&logoColor=white) | Micro-state management that is 40x lighter than Redux with zero boilerplate. |
| **Navigation** | ![React Navigation](https://img.shields.io/badge/React_Navigation-20232A?style=for-the-badge&logo=react-router&logoColor=61DAFB) | Native screen primitives ensuring smooth transitions and deep linking support. |
| **Storage** | ![AsyncStorage](https://img.shields.io/badge/Async_Storage-20232A?style=for-the-badge&logo=sqlite&logoColor=white) | Persistent encrypted key-value storage for offline case data. |
| **File System** | ![Expo FS](https://img.shields.io/badge/Expo_FileSystem-4630EB?style=for-the-badge&logo=expo&logoColor=white) | Handles binary document storage, caching, and base64 encoding for backups. |
| **Date Time** | ![Day.js](https://img.shields.io/badge/Day.js-FF5F4D?style=for-the-badge&logo=javascript&logoColor=white) | Immutable date library for precise deadline calculations and timezones. |

## Core Capabilities

### 1. Intelligent Case Management
Comprehensive lifecycle tracking from **Intake** to **Appeal**.
*   **Multi-Stage Tracking**: Granular status updates across 10+ distinct legal stages.
*   **Legal Code Integration**: Built-in support for BNS, BNSS, IPC, and CrPC.
*   **Timeline Visualization**: Automated chronological history of every case event.

### 2. Smart Deadline Engine
A proactive scheduling system designed to prevent missed filings.
*   **Urgency Algorithms**: Automated classification of tasks into **Critical**, **High**, and **Medium**.
*   **Custom Notifications**: Configurable alert triggers (Same Day, 24h, 72h) ensuring multi-layered reminders.

### 3. Secure Document Vault
Enterprise-grade document handling.
*   **Offline-First**: Documents encrypted locally, accessible without internet.
*   **Secure Sharing**: Intelligent MIME-type detection for safe external sharing.
*   **Full Backup**: JSON-based backup system including base64 encoded files.

## Project Structure

A clean, feature-driven architecture ensures maintainability.

![Project Structure](assets/structure.svg)

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/santhosh-reddy/advocat.git
    cd advocat
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start Development**
    ```bash
    npx expo start
    ```

## Developer Credits

![Developer Credits](assets/credits.svg)

---
*© 2024 Advocat. All Rights Reserved.*
