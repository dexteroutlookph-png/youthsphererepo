# YouthSphere

YouthSphere is the ISIED district youth community platform. It provides authenticated community posts, official announcements, digital reward cards, profiles, notifications, reporting, and staff/admin moderation.

## Technology

- Static HTML/CSS/JavaScript frontend served by Vercel
- Node.js and Express API
- Neon PostgreSQL through `pg`
- Cloudinary for profile, post, announcement, and media uploads
- JWT authentication with server-side session records
- Vercel routing for `/api/*` and clean frontend URLs

## Setup

```bash
npm install
npm --prefix backend install
npm run db:migrate
npm start
```

The frontend is in `frontend/`. For local development, serve that directory with a static server while the API runs on port `5001`, or use the existing Vercel deployment configuration.

## Environment Variables

Use environment configuration outside source control. Existing production values must be preserved.

```text
DATABASE_URL=
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=
JWT_SECRET=
CLIENT_URL=
FRONTEND_URL=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
NODE_ENV=
PORT=
SEED_ADMIN_EMAIL=
SEED_ADMIN_USERNAME=
SEED_ADMIN_PASSWORD=
```

`DATABASE_URL`, `JWT_SECRET`, and the Cloudinary variables are required for the corresponding production features. Configure the SMTP variables to enable password-reset email delivery. Never commit `.env` files, credentials, tokens, or API keys.

## Database

Migrations are in `backend/database/migrations/` and are additive. `002_missing_features.sql` extends the existing schema with password-reset tokens, shares, moderation actions, announcement management fields, legal agreement detail, reward audit fields, and indexes. It reuses the existing `comments`, `reactions`, `notifications`, `reports`, `reward_cards`, and `sessions` tables.

Run migrations only against the intended database. The migration command does not reset, drop, truncate, or reseed existing data. The seed command is intended for explicitly controlled development/bootstrap use and must not be run automatically against production.

## Features

- Login with username or email, registration, JWT protection, logout, and password reset token flow
- Profile editing including middle name, bio, and profile photo uploads
- Text, image, and video posts using Cloudinary
- Likes, comments, internal sharing, reporting, and notifications
- Searchable/filterable announcements with staff/admin create, edit, pin, and archive controls
- Physical reward-card linking, status controls, attendance/points history, QR display, and staff/admin audit transactions
- Member, staff, and admin authorization enforced by the API

## Reward Cards

A member links an existing physical card number. The API checks the authoritative `reward_cards` registry inside a transaction, prevents duplicate claims with the existing unique ownership constraint, and rejects suspended or revoked cards. Members cannot award points or alter attendance; staff/admin reward operations are audited in `reward_transactions`.

The current schema validates registry existence and one-account ownership. If the district requires a second possession factor or pre-assigned member identity, that authoritative field must be added to the existing card dataset before enforcing it.

## Roles

- **Member:** manage their profile, post, comment, react, share, report content, link their own card, and view district data.
- **Staff:** manage announcements, review reports, moderate content, and administer reward transactions/statuses.
- **Admin:** all staff capabilities plus system-level administration according to server-side role checks.

## Production Deployment

The existing Vercel deployment remains the deployment architecture. Keep the current `vercel.json`, Neon database, Cloudinary configuration, domains, and environment variables. Configure production environment variables in Vercel, deploy the project, and verify `/api/health` without exposing its secrets.

## Password Reset Email Delivery

The reset-token API stores only a SHA-256 token hash, expires tokens after one hour, invalidates reuse, and returns a generic response to prevent account enumeration. Configure the SMTP variables above and `FRONTEND_URL` or `CLIENT_URL` to deliver reset links. If SMTP is not configured, reset requests remain generic and no raw token is exposed.

## Validation

Use these checks before deployment:

```bash
node --check backend/server.js
node --check backend/routes/auth.routes.js
node --check backend/routes/posts.routes.js
node --check backend/routes/rewards.routes.js
node --check backend/routes/announcements.routes.js
npm run db:migrate
```

Do not run migrations or seeds against production without confirming the target database and having an appropriate backup/export plan.
