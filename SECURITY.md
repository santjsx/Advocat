# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

We take the security of our legal practice management system very seriously. If you discover a security vulnerability, please follow these steps:

1.  **Do NOT open a public issue.** This allows us to protect our users while fixing the vulnerability.
2.  Email our security team at **security@advocat.internal** (or the lead developer).
3.  Include a detailed description of the vulnerability and steps to reproduce it.

We aim to acknowledge all reports within 48 hours and will provide a timeline for the fix.

### Encryption Protocol
Advocat uses AES-256 for local document storage. If you find a flaw in the encryption implementation, please mark your report as **CRITICAL**.
