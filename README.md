# ThikAche API Documentation

Base URL: `/api`

All protected routes require an `Authorization` header (handled by `authMiddleware`). Routes not marked **Auth required** are public.

---

## Table of Contents

- [Help Requests](#help-requests-apirequests)
- [Reviews](#reviews-apireviews)
- [Users](#users-apiusers)
- [Data Models](#data-models)

---

## Help Requests — `/api/requests`

### `GET /api/requests`
List help requests with search, filtering, sorting, and pagination.

**Query params (all optional):**

| Param    | Type   | Description                                              |
|----------|--------|-----------------------------------------------------------|
| `search` | string | Full-text search on `title` / `shortDescription`          |
| `category` | string | Filter by category (`tech`, `tutoring`, `errand`, `moving`, `repair`, `other`) |
| `area`   | string | Filter by `areaLabel`                                      |
| `status` | string | Filter by status; defaults to `open` + `matched`           |
| `sort`   | string | `newest` (default), `oldest`, or `urgent`                  |
| `page`   | number | Page number, default `1`                                  |
| `limit`  | number | Items per page, default `12`                               |

**Response `200`:**
```json
{
  "items": [ /* HelpRequest[] */ ],
  "pagination": { "page": 1, "limit": 12, "total": 42, "totalPages": 4 }
}
```

---

### `GET /api/requests/:id`
Get a single help request by id, with `postedBy` and `helper` populated.

**Response:** `200` HelpRequest | `400` invalid id | `404` not found

---

### `GET /api/requests/:id/related`
Get up to 3 other open/matched requests in the same category.

**Response:** `200` HelpRequest[] | `404` not found

---

### `POST /api/requests` 🔒 Auth required
Create a new help request.

**Body:**
```json
{
  "title": "string (required)",
  "shortDescription": "string (required, max 200 chars)",
  "fullDescription": "string (required)",
  "category": "tech | tutoring | errand | moving | repair | other (required)",
  "areaLabel": "string (required)",
  "coordinates": [longitude, latitude],
  "budget": 0,
  "isPaid": true,
  "preferredTime": "ISO date string",
  "imageUrl": "string"
}
```

**Response:** `201` HelpRequest | `400` missing required fields

---

### `GET /api/requests/mine/posted` 🔒 Auth required
Get all requests posted by the logged-in user, with `helper` populated.

### `GET /api/requests/mine/helping` 🔒 Auth required
Get all requests the logged-in user is helping with, with `postedBy` populated.

---

### `PATCH /api/requests/:id/accept` 🔒 Auth required
Accept an open request as helper. Sets `status → matched`.

**Rules:** request must be `open`; you can't accept your own request.

**Response:** `200` HelpRequest | `400` | `403` | `404`

---

### `PATCH /api/requests/:id/in-progress` 🔒 Auth required
Mark a matched request as in progress. Only the assigned helper can do this.

**Rules:** request must be `matched`.

---

### `PATCH /api/requests/:id/complete` 🔒 Auth required
Mark a request complete. Only the original requester can do this.

**Rules:** request must be `matched` or `in_progress`.

---

### `PATCH /api/requests/:id/cancel` 🔒 Auth required
Cancel an open request. Only the original requester can do this.

**Rules:** request must be `open`.

---

### `DELETE /api/requests/:id` 🔒 Auth required
Delete a request. Allowed for the request owner or an admin.

**Response:** `200` `{ "message": "Request deleted" }` | `403` | `404`

---

## Reviews — `/api/reviews`

### `POST /api/reviews` 🔒 Auth required
Leave a review for the helper on a completed request.

**Body:**
```json
{
  "requestId": "string (required)",
  "rating": 1,
  "comment": "string (optional, max 500 chars)"
}
```

**Rules:**
- Request must have `status: completed`.
- Only the original requester can review.
- Request must have an assigned helper.
- One review per request per reviewer (enforced by a unique index on `request + reviewer`).

After creation, the helper's `avgRating` and `completedCount` on `UserProfile` are recalculated automatically.

**Response:** `201` Review | `400` | `403` | `404`

---

### `GET /api/reviews/user/:userId`
Get all reviews written about a given user, newest first, with `reviewer` and `request` populated.

**Response:** `200` Review[]

---

## Users — `/api/users`

### `GET /api/users/me/activity` 🔒 Auth required
Get the logged-in user's activity summary.

### `GET /api/users/:id`
Get a public user profile by id.

> Note: exact response shape depends on `user.controller.ts`, which wasn't included in this documentation pass — happy to fill this section in once shared.

---

## Data Models

### HelpRequest
| Field | Type | Notes |
|---|---|---|
| `title` | string | required, max 120 chars |
| `shortDescription` | string | required, max 200 chars |
| `fullDescription` | string | required |
| `category` | enum | `tech`, `tutoring`, `errand`, `moving`, `repair`, `other` |
| `location` | GeoJSON Point | `{ type: "Point", coordinates: [lng, lat] }`, 2dsphere indexed |
| `areaLabel` | string | required |
| `budget` | number | optional, min 0 |
| `isPaid` | boolean | default `false` |
| `preferredTime` | Date | optional |
| `imageUrl` | string | optional |
| `status` | enum | `open`, `matched`, `in_progress`, `completed`, `cancelled` |
| `postedBy` | ObjectId → UserProfile | required |
| `helper` | ObjectId → UserProfile | optional |

### Review
| Field | Type | Notes |
|---|---|---|
| `request` | ObjectId → HelpRequest | required |
| `reviewer` | ObjectId → UserProfile | required |
| `reviewee` | ObjectId → UserProfile | required |
| `rating` | number | required, 1–5 |
| `comment` | string | optional, max 500 chars |

Unique index: one review per `(request, reviewer)` pair.

### UserProfile
| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `email` | string | |
| `role` | enum | `user`, `admin` |
| `area` | string | optional |
| `avgRating` | number | default `0`, auto-updated from reviews |
| `completedCount` | number | default `0`, auto-updated from reviews |

Stored in the `user` collection with `strict: false` — extra fields beyond this schema may exist at runtime.