<div align="center">

# ThikAche — Server

### Standalone Express API for the ThikAche hyperlocal help-exchange platform

A decoupled, auth-agnostic REST API that powers request matching, reviews, and user data for [ThikAche](https://thikache.vercel.app) — verifying every request against JWTs issued by the Next.js frontend, without ever installing the auth package itself.

[Live Frontend](https://thikache.vercel.app) · [Frontend Repo](https://github.com/SyntaxAdil) · [Backend Repo](https://github.com/SyntaxAdil/thik-ache-server)

</div>

---

## Overview

This service is the API layer for ThikAche's core loop — posting a help request, getting matched with a helper, marking it complete, and leaving a review. It's built as a completely standalone Express app, separate from the Next.js frontend, and communicates with it only through verified JWTs — no shared session store, no shared auth package.

```
Post Request → Nearby Helpers Notified → Helper Accepts (Matched)
     → Work Happens → Requester Marks Complete
          → Both Parties Review Each Other → Reputation Score Updates
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 LTS |
| Framework | Express 5 |
| Language | TypeScript 5.7+ |
| Database | MongoDB Atlas |
| ODM | Mongoose 9 |
| Auth Verification | `jose` (`createRemoteJWKSet` + `jwtVerify`) |
| Package Manager | bun |

---

## Authentication Model

This API **never installs or depends on better-auth**. All account creation, login, and session management happens on the Next.js frontend. This server's only job is to verify that an incoming request is carrying a valid, signed token.

1. A user logs in on the Next.js app via better-auth.
2. better-auth's JWT plugin issues a short-lived, signed JWT (EdDSA/Ed25519).
3. The client attaches this token as `Authorization: Bearer <token>` on every request to this API.
4. `middleware/authMiddleware.ts` fetches and caches the frontend's public signing keys via `createRemoteJWKSet`, then verifies the token with `jwtVerify()` on every protected route.
5. If verification succeeds, the decoded user ID/role is attached to the request and passed downstream; if it fails, the request is rejected before it reaches any controller.

Role and ownership checks (e.g. "only the requester can mark their own request complete") are re-validated inside each controller — the token's claims are trusted, but a client's *intent* never is.

---

## Project Structure

```
controllers/    → business logic per resource (help requests, reviews, users)
middleware/     → JWT verification, error handling
model/          → Mongoose schemas (HelpRequest, Review, UserProfile)
routes/         → Express routers, mounted under /api
utils/          → shared helpers (async handler, token validation, user-id extraction)
app.ts          → Express app setup
index.ts        → server entry point
```

---

## API Reference

Base URL: `/api`

All protected routes require an `Authorization: Bearer <token>` header issued by the Next.js frontend.

### Help Requests — `/api/requests`

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| GET | `/requests` | ❌ | List all help requests — supports search, category/area filters, sorting, and pagination |
| GET | `/requests/:id` | ❌ | Get a single help request's full details |
| GET | `/requests/:id/related` | ❌ | Get related requests (same category / nearby area) |
| GET | `/requests/mine/posted` | ✅ | Get all requests posted by the logged-in user |
| GET | `/requests/mine/helping` | ✅ | Get all requests the logged-in user is currently helping with |
| POST | `/requests` | ✅ | Create a new help request (`status` defaults to `open`) |
| PATCH | `/requests/:id/accept` | ✅ | Helper accepts an open request (`status` → `matched`) |
| PATCH | `/requests/:id/in-progress` | ✅ | Mark a matched request as in progress |
| PATCH | `/requests/:id/complete` | ✅ | Requester marks the request as completed |
| PATCH | `/requests/:id/cancel` | ✅ | Requester cancels a request (only if not yet matched) |
| DELETE | `/requests/:id` | ✅ | Delete a request (owner or admin only) |

### Reviews — `/api/reviews`

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| GET | `/reviews/recent` | ❌ | Get the most recent reviews platform-wide (used on the landing page) |
| GET | `/reviews/user/:userId` | ❌ | Get all reviews written by a specific user |
| GET | `/reviews/user/:userId/stats` | ❌ | Get a user's aggregated rating stats (average rating, review count) |
| GET | `/reviews/for-user/:userId` | ❌ | Get all reviews received by a specific user |
| GET | `/reviews/request/:requestId` | ❌ | Get all reviews tied to a specific help request |
| GET | `/reviews/request/:requestId/check` | ✅ | Check whether the logged-in user has already reviewed this request |
| GET | `/reviews/all` | ✅ | Get all reviews platform-wide (admin only) |
| POST | `/reviews` | ✅ | Submit a review (requester → helper or helper → requester, post-completion only) |

### Users — `/api/users`

| Method | Endpoint | Auth Required | Description |
|---|---|:---:|---|
| GET | `/users/:id` | ❌ | Get a user's public profile (name, rating, completed-request count) |
| GET | `/users` | ✅ | List all users (admin only) |
| PATCH | `/users/:id` | ✅ | Update a user's profile details |
| DELETE | `/users/:id` | ✅ | Remove a user account (admin only) |

> Exact user-route behavior may differ slightly from the table above — confirm against `routes/user.routes.ts` if integrating against this API directly.

---

## Data Models

**HelpRequest** — title, short/full description, category, geolocation + area label, optional budget, preferred time, status (`open` → `matched` → `in_progress` → `completed` / `cancelled`), references to poster and helper

**Review** — linked to a request, rating (1–5), comment, and direction (`requester_to_helper` or `helper_to_requester`)

**UserProfile** — synced profile data, role (`user` / `admin`), geolocation, average ratings as helper/requester, completed-request count

MongoDB indexes: `2dsphere` on geolocation fields for proximity queries, a text index on request titles/descriptions for search, and a compound index on `{status, category, areaLabel}` for fast filtered listing queries.

---

## Environment Variables

```env
PORT=
MONGODB_URI=
JWKS_URL=            # e.g. https://thikache.vercel.app/api/auth/jwks
CLIENT_ORIGIN=        # for CORS
```

---

## Getting Started

```bash
bun install
bun run dev
```

Ensure `MONGODB_URI` points to a MongoDB Atlas cluster with geospatial indexing enabled, and `JWKS_URL` points to the deployed Next.js frontend's JWKS endpoint so incoming tokens can be verified.

---

## Author

**Md. Abdur Rahman**

- GitHub: [@SyntaxAdil](https://github.com/SyntaxAdil)
- Portfolio: [abdur-rahman-dev.vercel.app](https://abdur-rahman-dev.vercel.app)