# Changelog

All notable changes to this project are documented here.
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [1.3.0] - 2026-04-19

### Added
- Full browse + filter list on records page (replaces search-only view)

### Fixed
- Save `assigned_driver_id` correctly when creating a new customer record

---

## [1.2.0] - 2026-04-14

### Added
- Microsoft Clarity analytics integration

### Changed
- Homepage redesigned: SpiderWebCanvas hero, sticky call bar, quick contact strip, portal CTA

---

## [1.1.0] - 2026-04-01

### Added
- Driver dashboard with session tracking
- Email OTP login option alongside password login
- Auto-fill customer details for returning customers on new record form
- LLR number and issue date fields on new record form

### Changed
- Staff dashboard rebuilt: clickable stat cards and reminder tasks
- Fee structure: Total Fee + Govt Fee inputs with auto-calculated profit
- DL Application renamed to DL Test Application; govt app ref no. replaces existing DL number field
- Records rebuilt for Sarathi services workflow

### Fixed
- Team visibility fix for driver role
- Owner idle logout on tab hide; staff 10-minute idle timeout
- Made key fields mandatory on new record form

---

## [1.0.0] - 2026-03-31

### Added
- S3 document upload, view, and delete for customer records
- Forgot password and reset password flow
- Team access control and password reset for staff
- Permanent staff delete with confirmation
- Block disabled staff from logging in
- Allow adding owners via team management page
- LLR eligibility alerts and payment reminders
- Vercel Speed Insights

### Fixed
- Delete staff: use service role to bypass RLS for owner check
- Back to login button styling on forgot password view

---

## [0.3.0] - 2026-03-13

### Added
- TOTP MFA enforced for owner and staff accounts
- Owner dashboard: revenue overview, desk entries, driver sessions
- Owner-only team management for adding staff and drivers
- Payment tracking and session progress on customer records
- Auto-logout after 30 minutes of inactivity

### Fixed
- Hard redirect for MFA to prevent bypass
- RLS error when adding team member (use tempClient for profile insert)
- TypeScript build error in team page
- Next.js upgraded to 14.2.35 (security patch)

---

## [0.1.0] - 2026-03-13

### Added
- Initial launch: Senthil Velan Driving School website with customer portal
