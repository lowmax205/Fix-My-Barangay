<!--
SYNC IMPACT REPORT (2025-09-23)
===============================
Version change: template → 1.0.0 (MAJOR: Initial constitution creation)

Modified principles:
- Added I. Progressive Web App First (Android PWA requirements)
- Added II. Privacy by Design (minimal data collection)
- Added III. Offline-First Architecture (low-bandwidth optimization)
- Added IV. Security & Rate Limiting (API endpoint protection)
- Added V. Mobile-First Accessibility (inclusive design)

Added sections:
- MVP Development Constraints (fast delivery approach)
- Technology Standards (tech stack specifications)

Templates requiring updates:
✅ .specify/templates/plan-template.md (updated constitution check gates)
✅ .specify/templates/tasks-template.md (updated for manual testing approach)
✅ .specify/templates/spec-template.md (updated for PWA-specific underspecified areas)

Follow-up TODOs:
- None - all placeholders resolved for initial version
-->

# Fix My Barangay PWA Constitution

## Core Principles

### I. Progressive Web App First

The application MUST function as a fully installable Progressive Web App (PWA) on Android devices.
Service Worker implementation is mandatory for offline functionality. Web App Manifest must define
proper icons, theme colors, and display modes. App shell architecture required for instant loading.

**Rationale**: Mobile-first citizen engagement requires native app experience without app store friction.

### II. Privacy by Design

Minimize personal data collection to essential reporting information only. No user authentication
required for issue reporting. Location data used only for issue geolocation, not user tracking.
Data retention policies must be clearly defined and minimal.

**Rationale**: Community trust depends on protecting citizen privacy while enabling civic participation.

### III. Offline-First Architecture

Application MUST function fully offline for core reporting features. Issue reports queued locally
when offline and synchronized when connectivity returns. Critical offline capabilities include:
photo capture, location selection, report drafting, and SMS fallback for urgent issues.

**Rationale**: Low-bandwidth environments and unreliable connectivity are common in target communities.

### IV. Security & Rate Limiting

SMS endpoints MUST implement rate limiting to prevent abuse. Input validation required for all
user-generated content. Image uploads sanitized and size-limited. API endpoints protected against
common attacks (CSRF, XSS, injection). No sensitive data in client-side storage.

**Rationale**: Public-facing civic reporting systems are attractive targets for abuse and attacks.

### V. Mobile-First Accessibility

Touch-optimized interface with minimum 44px touch targets. High contrast mode support. Screen
reader compatibility with proper ARIA labels. Works effectively on low-end Android devices.
Network-aware image loading and compression for bandwidth efficiency.

**Rationale**: Digital inclusion requires accessibility across diverse devices and user abilities.

## MVP Development Constraints

Fast delivery approach with intentional technical debt for rapid market validation:

- Skip automated test files during initial MVP development
- Manual testing procedures documented for each feature
- Comprehensive testing suite planned for post-MVP iterations
- Focus on core user journeys: report issue, view status, SMS fallback

**Rationale**: Community problems require rapid solutions; technical excellence follows user validation.

## Technology Standards

**Frontend**: Vanilla JavaScript or lightweight framework optimized for PWA requirements.
Service Worker for caching and offline capabilities. IndexedDB for local data storage.
Responsive CSS with mobile-first breakpoints.

**Backend**: Node.js with Express for rapid development. PostgreSQL for data persistence.
RESTful API design with JSON responses. Cloudinary for image storage and optimization.

**External Services**: Mapbox for location services. EngageSpark for SMS integration.
Weather-resistant service integrations with fallback mechanisms.

**Deployment**: Vercel/Netlify for frontend hosting with CDN. Railway/Heroku for backend API.
Environment-based configuration for development, staging, and production deployments.

## Governance

Constitution supersedes all implementation decisions and technical choices. Feature specifications
must demonstrate compliance with core principles before development begins. MVP constraints
override general testing requirements but not security, privacy, or accessibility principles.

Amendment procedures:

- MAJOR version: Principle removal or fundamental architecture changes
- MINOR version: New principles or expanded governance sections
- PATCH version: Clarifications and non-semantic improvements

All development decisions must reference applicable constitutional principles. Non-compliance
requires explicit justification and mitigation strategies. Post-MVP iterations must address
technical debt accumulated during fast delivery phase.

**Version**: 1.0.0 | **Ratified**: 2025-09-23 | **Last Amended**: 2025-09-23
