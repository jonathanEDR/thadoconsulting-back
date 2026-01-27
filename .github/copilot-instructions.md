# Copilot Instructions for web-scuti-backend

## Project Overview
- **Stack:** Node.js, Express, MongoDB (via Mongoose), Clerk for authentication, Cloudinary for media, modular service-oriented structure.
- **Entry Point:** `server.js` (loads all routes, connects DB, initializes categories, cache, and message templates).
- **Environment:** Uses `.env` for secrets (DB, Clerk, Cloudinary, etc). Production requires all keys set.

## Key Architectural Patterns
- **Routes:** All API endpoints are defined in `routes/` and use modular controllers from `controllers/`.
- **Controllers:** Business logic is in `controllers/`, each file maps to a resource/domain.
- **Models:** Mongoose schemas in `models/` for all main entities (User, Blog, Lead, etc).
- **Middleware:** Auth, role, and validation logic in `middleware/`. Clerk JWT validation is in `middleware/clerkAuth.js` (production-ready, MongoDB is source of truth for roles).
- **Config:** External service configs in `config/` (Cloudinary, DB, roles, etc).
- **Utils:** Initialization, helpers, and service logic in `utils/`.

## Authentication & Authorization
- **Clerk Integration:**
  - Clerk JWTs are validated in `middleware/clerkAuth.js` using `@clerk/clerk-sdk-node`.
  - User roles/permissions are always loaded from MongoDB, not Clerk.
  - `req.user` and `req.auth` are populated for downstream use.
- **Role System:**
  - Roles and permissions are defined in `config/roles.js`.
  - Use `getRolePermissions(role)` to fetch permissions for a role.

## Developer Workflows
- **Start (prod):** `npm start` (runs `server.js`)
- **Start (dev):** `npm run dev` (nodemon reloads on changes)
- **Seed Data:**
  - `npm run seed:servicios` (service data)
  - `npm run seed:mensajeria` (messaging templates)
- **Environment:** Ensure all required secrets are set in `.env` before running.

## Project Conventions
- **Spanish Naming:** Most code/comments are in Spanish. Use Spanish for new code/comments unless otherwise specified.
- **Modularization:** Add new features as new route/controller/model/middleware files, following existing patterns.
- **Error Handling:** Use structured JSON responses with `success`, `message`, and `code` fields.
- **Logging:** Use `utils/logger.js` for all logs (startup, errors, warnings, etc).

## Integration Points
- **Clerk:** Auth via Clerk JWT, but user/role data is always from MongoDB.
- **Cloudinary:** Media uploads via `config/cloudinary.js` and related utils.
- **External APIs:** Use `axios` or `node-fetch` for outbound HTTP calls.

## Examples
- **Add a new protected route:**
  1. Create controller in `controllers/`.
  2. Add route in `routes/`, use `requireAuth` and role middleware as needed.
  3. Register route in `server.js`.

- **Add a new model:**
  1. Define schema in `models/`.
  2. Use in controllers/services as needed.

---
For questions or unclear conventions, review similar files or ask for clarification. Update this file if you discover new patterns.
