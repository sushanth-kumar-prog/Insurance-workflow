# Insurance Claim Workflow — Rule-Based Adjudication Engine

A pre-authorisation and settlement workflow for health insurance claims. Claims move through a
guarded state machine; every transition is adjudicated against policy terms and written to an
append-only audit log.

- **Backend** — Express 5 + Mongoose 9 (CommonJS)
- **Frontend** — React 19 + Vite 8 + Tailwind CSS 4
- **Database** — MongoDB (Atlas SRV in development, containerised `mongo:6.0` in Docker)

---

## Quick start

```bash
# 1. Configure
cp .env.example .env      # then fill in MONGO_URI and JWT_SECRET

# 2. Install
npm install
cd client && npm install && cd ..

# 3. Seed policies and demo users (idempotent)
npm run seed

# 4. Run
npm start                 # API on http://localhost:5000
cd client && npm run dev  # UI on http://localhost:5173
```

No local MongoDB? `npm run dev:server` starts the API against an in-memory MongoDB
(`mongodb-memory-server`), so the app runs with zero external services.

> On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is disabled.

### Seeded accounts

All use the password `Str0ngPass1`.

| Email | Role | Notes |
|---|---|---|
| `claimant@example.com` | `CLAIMANT` | Holds `POL-2024-0001` |
| `desk@example.com` | `HOSPITAL_DESK` | Raises claims |
| `verifier@example.com` | `VERIFIER` | Adjudicates |
| `officer@example.com` | `MEDICAL_OFFICER` | Clinical review |
| `approver@example.com` | `APPROVER` | The only role that may `APPROVED` |
| `finance@example.com` | `FINANCE` | The only role that may `SETTLED` |

Seeded policies deliberately differ so the engine is observable:

| Policy | Inception | Caps | Purpose |
|---|---|---|---|
| `POL-2024-0001` | 2022-03-15 | IOL 15000, room 5000, phaco sub-limit 40000 | Mature policy, full adjudication |
| `POL-2025-0002` | ~45 days ago | IOL 12000, room 3500 | Inside its 24-month waiting period |

---

## Ports

| Service | Port | Notes |
|---|---|---|
| Backend API | `5000` | Canonical API port, local and containerised |
| Vite dev server | `5173` | Proxies `/api` → `localhost:5000` |
| Frontend container | `3000` | nginx, proxies `/api` → `backend:5000` |

Override with `PORT`, `VITE_PORT`, and `VITE_API_TARGET`.

---

## Claim lifecycle

```
DRAFT → PRE_AUTH_SUBMITTED → IN_REVIEW ⇄ QUERY_RAISED / QUERY_RESPONDED
                                    ↓
                          APPROVED → SETTLED
                            or REJECTED
```

Transitions are validated by `src/utils/stateMachine.js` **and** by role
(`TRANSITION_ROLES` in `src/controllers/claimController.js`). The matrix matters: without it a
claimant could walk their own claim straight to `APPROVED`.

---

## Adjudication rules

Applied sequentially per bill item in `src/engine/adjudicator.js`:

1. **Non-payables stripped** — gloves, admin fees, stationery, registration, diet
2. **Sub-limits** — procedure sub-limits and room-rent cap, both from the policy
3. **IOL tariff cap**
4. **Waiting period** — pre-existing procedures before the waiting period has elapsed
5. **Sum insured** — exhausted balance caps the remainder

Fraud and document checks run in parallel (`src/engine/fraudDetector.js`): waiting-period abuse,
duplicate-eye, IOL tariff breach, rapid second-eye, and missing documents.

All caps are read from the policy document. They are **not** hardcoded — an earlier version passed
`iolTariffCap: 15000, roomCap: 5000` as literals, which made every policy behave identically.

---

## API

All routes are authenticated; role shown where restricted.

| Method | Path | Roles |
|---|---|---|
| `POST` | `/api/auth/register` | — |
| `POST` | `/api/auth/login` | — |
| `GET` | `/api/auth/me` | any |
| `POST` | `/api/simulator/evaluate` | — |
| `POST` | `/api/claims` | `CLAIMANT`, `HOSPITAL_DESK` |
| `GET` | `/api/claims` | owner-scoped for non-staff, whole book for staff |
| `POST` | `/api/claims/:id/adjudicate` | `VERIFIER`, `MEDICAL_OFFICER`, `APPROVER` |
| `POST` | `/api/claims/:id/transition` | per target state (see matrix) |
| `GET` | `/api/claims/:id/audit-trail` | owner or staff — also returns computed `sla` |
| `GET` | `/api/claims/:id/fhir` | owner or staff |
| `POST` | `/api/claims/:id/dispute-line-item` | owner or staff |
| `POST` | `/api/claims/:id/documents` | owner or staff — multipart, 5 files × 5 MB |
| `POST` | `/api/nhcx/submit` | `VERIFIER`, `APPROVER`, `FINANCE` |
| `GET` | `/api/policies` | staff, `CLAIMANT`, `HOSPITAL_DESK` |
| `POST` | `/api/policies` | `VERIFIER`, `MEDICAL_OFFICER`, `APPROVER`, `FINANCE` |
| `POST` | `/api/policies/assign/:userId` | `VERIFIER`, `MEDICAL_OFFICER`, `APPROVER`, `FINANCE` |
| `GET` | `/api/analytics/sla-summary` | `VERIFIER`, `APPROVER`, `FINANCE`, `MEDICAL_OFFICER` |

### Ownership

Claims record `createdBy`. Staff roles (`VERIFIER`, `MEDICAL_OFFICER`, `APPROVER`, `FINANCE`) may
act on any claim; everyone else is restricted to claims they created. This applies uniformly,
including the FHIR projection.

---

## Security

- `JWT_SECRET` is **required** when `NODE_ENV=production`; the app refuses to boot without it
- Rate limits: 10 login attempts / 15 min, 20 registrations / 15 min, per IP
- Passwords: minimum 8 chars with upper, lower and digit
- Helmet security headers; credentialed CORS restricted to `CLIENT_URL`
- Error handler maps `CastError` → 400, `ValidationError` → 400, duplicate key → 409, DB down → 503,
  and never leaks internals in production
- `AuditLog` is append-only: updates and deletes are rejected at the model layer

`.env` is gitignored and excluded from Docker builds, so credentials cannot be committed or baked
into an image.

---

## Testing

```bash
npm test        # 63 tests
```

| File | Covers |
|---|---|
| `adjudicator.test.js` | Individual deduction rules |
| `adjudication.e2e.test.js` | Full path: policy → claim → adjudicate → audit log |
| `analyticsQueries.test.js` | Query-count regression guard (N+1) |
| `documents.test.js` | Disputes, multipart upload, claim scoping, SLA payload |
| `policyDetails.test.js` | Claim/policy mapping, calendar-aware month maths |
| `routing.test.js` | NHCX route ownership and CORS policy |
| `routeOrdering.test.js` | Express static-before-parameterized contract |
| `stateMachine.test.js` | Transition rules and append-only audit log |
| `simulator*.test.js` | Simulator and validation |

---

## Frontend components

| Component | Purpose |
|---|---|
| `PersonaBar` | One-click role switcher for demos. Dev-only: gated behind `VITE_ENABLE_PERSONA_BAR`, and always hidden in a production build unless that flag is set |
| `SlaBreachPulse` | Live per-second SLA countdown. Stops ticking while the server reports the clock paused |
| `LineItemDisputeModal` | Files a dispute against a specific deduction row, citing its reason code and policy clause |
| `OutOfPocketExplorer` | Lens slider driving the live adjudication engine to show the insurer/patient split |
| `UploadSection` | Real multipart upload with progress, client-side size validation, and server-side type checks |

Uploads are stored under `uploads/` (git- and Docker-ignored) with **generated** filenames — the
client-supplied name is kept only as metadata, never used on disk.

The analytics test asserts the SLA summary issues a **constant** number of queries, and that the
count does not grow when claims are added. Reintroducing a per-claim query fails the suite.

---

## Docker

```bash
cp .env.example .env   # JWT_SECRET is required
docker compose up --build
```

Brings up MongoDB, the API on `:5000`, and nginx serving the built client on `:3000` with `/api`
proxied to the backend.

---

## Project layout

```
src/
  config/db.js               Mongoose connection
  engine/                    Adjudication, fraud detection, constants
  models/                    User, Policy, Claim, AuditLog
  controllers/               Request handlers
  routes/                    Route tables
  middleware/                Auth, validation, error handling
  utils/                     State machine, SLA engine, FHIR mapping
  server.js                  Production entrypoint
  dev-server.js              In-memory MongoDB entrypoint
  seed.js                    Idempotent seed
client/src/pages/            Simulator, Claimant, Hospital, Insurer, Analytics, Showcase
tests/                       Node test runner suites
```

---

## Notes and limitations

- The SLA summary caps its working set at 1000 claims (`MAX_CLAIMS`) and does not paginate beyond that.
- `POST /api/claims` requires a real, `ACTIVE` policy; dangling policy references are rejected up front.
- Seeded users share one development password. Rotate before any shared deployment.
- `PersonaBar` embeds demo credentials and must stay behind `VITE_ENABLE_PERSONA_BAR`.
- Uploaded files are validated by MIME type and extension, not by inspecting file contents.
