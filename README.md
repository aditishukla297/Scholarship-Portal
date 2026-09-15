# AI-Enabled Scholarship and Fellowship Management System

**Ministry of Tribal Affairs, Government of India** — Smart India Hackathon prototype.

A full-stack portal for administering scholarship and fellowship schemes for Scheduled Tribe
students, from application through automated document verification and officer review to
the Direct Benefit Transfer credit.

> **Prototype notice.** This is a hackathon submission, not a deployed Government system.
> The emblems are simplified renderings and must be replaced with official artwork before
> any real deployment (see *Branding and emblems* below). OCR is a deterministic simulation
> with a documented integration point, not a real document-AI service.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios, Lucide Icons |
| Backend | Node.js, Express 4, MongoDB (Mongoose 8), JWT, Multer |
| AI modules | Eligibility rule engine, OCR extraction placeholder, deficiency detection, duplicate detection, officer recommendation |
| Charts | Hand-rolled inline SVG (no chart library) — bar, column, donut, progress meter |

---

## Running the project

### Prerequisites

- Node.js 18 or above
- MongoDB running locally, **or** use the built-in in-memory database (see below)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env     # already present; edit if required
npm run seed             # loads schemes, users and ~80 sample applications
npm run dev              # http://localhost:5175
```

**No MongoDB installed?** Set `USE_MEMORY_DB=true` in `server/.env`. An ephemeral in-memory
MongoDB is started and seeded automatically on boot. Data is discarded when the server stops.

### 2. Frontend

```bash
cd client
npm install
npm run dev              # http://localhost:5180 (Vite proxies /api to the backend)
```

Open **http://localhost:5180**.

### Ports

The API defaults to **5175** and the client to **5180**. Port 5000 is used by macOS AirPlay
Receiver and is deliberately avoided. To change them, edit `PORT` and `CLIENT_ORIGIN` in
`server/.env`, and `server.port` plus the proxy `target` in `client/vite.config.js`.

---

## Demonstration accounts

| Role | Email | Password |
|---|---|---|
| Applicant | `student@example.in` | `Student@1234` |
| Verifying Officer | `officer@tribal.gov.in` | `Officer@1234` |
| Administrator | `admin@tribal.gov.in` | `Admin@1234` |

Officer and administrator accounts cannot be self-registered — they are provisioned by an
administrator under **Administration → Manage Users**, mirroring real Ministry practice.

---

## What each role can do

**Applicant** — register, run the eligibility pre-check, submit a six-step application, upload
documents, respond to deficiencies, and track the application through to the DBT credit.

**Verifying Officer** — work the filtered application queue, read the AI verification panel
(document, OCR output, confidence, rules, recommendation), verify, raise deficiencies, select,
sanction or reject, run the merit-ranked selection dashboard, generate official letters, and
view the MIS dashboard.

**Administrator** — create and amend schemes, configure eligibility rules and document
requirements without touching code, provision officer accounts, and generate reports.

---

## The AI modules

All five are **advisory**. No application is ever approved, rejected or selected without an
officer's recorded order, and every override of a system recommendation is flagged in the
audit trail.

| Module | File | What it does |
|---|---|---|
| Eligibility rule engine | `server/src/services/eligibility.js` | Evaluates a profile against each scheme's declared rules; returns a per-rule verdict, a weighted match score and the merit score |
| OCR extraction | `server/src/services/ocr.js` | Extracts document fields and compares them with the declared form particulars, with per-field confidence |
| Deficiency detection | `server/src/services/deficiency.js` | Missing documents, expired certificates, field mismatches, illegible scans, un-seeded bank accounts |
| Duplicate detection | `server/src/services/duplicate.js` | Flags a second live application for the same applicant, Aadhaar reference or certificate number in the same year |
| Officer recommendation | `server/src/routes/applications.js` (`runAiPipeline`) | Combines the above into a confidence score and a recommendation |

### Replacing the OCR placeholder with a real engine

`runOcr()` in `server/src/services/ocr.js` is the single integration point. Swap its body for a
call to Tesseract, a Government cloud OCR endpoint or the DigiLocker issued-document API, and
keep the returned shape:

```js
{ engine, processedAt, confidence, fields: [{ key, label, value, expectedValue, matchesProfile, confidence }], rawText }
```

Nothing else in the codebase needs to change — deficiency detection, the verification panel and
the confidence badges all read from this shape.

A file whose name contains `mismatch`, `blur`, `expired`, `old` or `scan` deliberately produces a
degraded or mismatched read, so the deficiency workflow can be demonstrated on demand.

---

## API reference

Base URL `/api`. Authenticated routes expect `Authorization: Bearer <token>`.

### Auth
| Method | Path | Access |
|---|---|---|
| POST | `/auth/register` | Public (applicants only) |
| POST | `/auth/login` | Public |
| GET / PUT | `/auth/me` | Authenticated |

### Schemes
| Method | Path | Access |
|---|---|---|
| GET | `/schemes` | Public |
| GET | `/schemes/:idOrCode` | Public |
| POST / PUT / DELETE | `/schemes`, `/schemes/:id` | Administrator |

### Applications
| Method | Path | Access |
|---|---|---|
| GET | `/applications` | Authenticated (scoped by role; filters: status, state, scheme, level, q, deficient) |
| GET | `/applications/summary` | Authenticated |
| GET | `/applications/:id` | Owner, officer or administrator |
| POST | `/applications` | Applicant |
| PUT | `/applications/:id` | Owner (`{ submit: true }` submits) |
| POST | `/applications/:id/deficiencies/:code/respond` | Applicant |
| DELETE | `/applications/:id` | Owner (drafts) or administrator |

### Verification and OCR
| Method | Path | Access |
|---|---|---|
| POST | `/ocr` (also `/verify/ocr`) | Authenticated — multipart upload + extraction |
| POST | `/verify` | Officer / administrator — records a decision |
| GET | `/verify/queue` | Officer / administrator |
| GET | `/verify/:applicationId` | Officer / administrator — the verification panel payload |
| GET | `/verify/selection/list` | Officer / administrator — merit-ranked candidates |
| GET | `/verify/documents/:applicationId/:storedName` | Owner, officer or administrator |

### Eligibility, analytics and support
| Method | Path | Access |
|---|---|---|
| POST | `/eligibility/check` | Public |
| GET | `/analytics` | Officer / administrator |
| GET | `/analytics/report` | Officer / administrator (`?format=csv`) |
| GET / POST / PUT | `/users` | Administrator |
| POST | `/grievances` | Public |
| GET | `/grievances` | Authenticated |
| GET | `/health` | Public |

---

## Database models

**User** — name, email, phone, passwordHash, `aadhaarMasked`, category, role, gender, state,
district, designation, active.

**Scheme** — code, name, type, description, benefits, educationLevels, slots, amount, application
window, `eligibilityRules[]`, `requiredDocuments[]`, active.

**Application** — applicationId, applicant, scheme, status, personal, category, academic, bank,
`documents[]` (each with its OCR result), `deficiencies[]`, `timeline[]`, `aiFindings`,
disbursement.

**Verification** — application, officer, action, remarks, confidence, aiRecommendation,
`overrodeAi`, documentsChecked, timestamp.

---

## Design system

The interface follows the presentation conventions of NIC-built Government of India portals
(NSP, GeM, DigiLocker, DBT Tribal, MyGov).

**Colours** — Primary Navy `#0B3D91`, Secondary Blue `#163A70`, Saffron `#FF9933`,
Green `#138808`, light grey sections `#F5F6F8`, white panel backgrounds.

**Typography** — Noto Sans, falling back to Inter and Source Sans 3. Noto Sans Devanagari for
Hindi. Main title 28px, section title 20px, card heading 17px, body 14px, tables 13px.

**Conventions** — 6px border radius, 1px borders, minimal shadows, compact spacing, navy table
headers with uppercase labels, zebra striping, saffron underline on active navigation. No
glassmorphism, gradients-as-decoration, oversized cards or floating elements.

The reusable classes live in `client/src/index.css` (`.gov-panel`, `.gov-table`, `.gov-btn-*`,
`.gov-input`, `.gov-badge`, `.gov-alert-*`, `.gov-sidebar-link`, `.gov-kv`).

**Accessibility** — skip-to-content link, A+ / A / A- text scaling with persistence, high-contrast
toggle, English / हिन्दी switching, visible saffron focus rings, semantic landmarks, table
captions and scoped headers, and ARIA labelling throughout (GIGW / WCAG oriented).

---

## Project structure

```
mota-portal/
├─ server/
│  └─ src/
│     ├─ config/db.js
│     ├─ models/          User, Scheme, Application, Verification
│     ├─ routes/          auth, schemes, applications, verification, eligibility, analytics, users, grievance
│     ├─ services/        eligibility, ocr, deficiency, duplicate
│     ├─ middleware/      auth (JWT + RBAC), upload (Multer), error
│     ├─ data/seedData.js NFST, NOS, Top Class, Post Matric, Pre Matric
│     ├─ seed.js
│     └─ index.js
└─ client/
   └─ src/
      ├─ components/      GovHeader, UtilityBar, Navbar, Sidebar, Footer, Breadcrumbs,
      │                   DataTable, StatusBadge, Timeline, Stepper, UploadComponent,
      │                   DeficiencyPanel, Cards, Emblem, Illustration, Layouts, charts/
      ├─ context/         AuthContext, UiContext (language, text size, contrast)
      ├─ pages/
      │  ├─ public/       Landing, Login, Register, EligibilityChecker, Schemes,
      │  │                Helpdesk, DbtInfo, TrackApplication
      │  ├─ applicant/    Dashboard, ApplicationForm, MyApplications,
      │  │                ApplicationDetail, Deficiencies, Documents
      │  ├─ officer/      OfficerDashboard, ApplicationQueue, VerificationPanel,
      │  │                SelectionDashboard, Communications
      │  ├─ admin/        AdminDashboard, ManageSchemes, EligibilityRules,
      │  │                ManageUsers, Reports
      │  └─ Analytics.jsx
      ├─ data/            strings (EN/HI), reference lists, FAQs
      └─ App.jsx
```

---

## Privacy and security

- Aadhaar is **never stored in full** — only the masked `XXXX XXXX 1234` form is persisted, and
  the masking happens server-side in `User.maskAadhaar()`.
- Passwords are hashed with bcrypt and excluded from every query by default (`select: false`).
- JWT with an 8-hour expiry; role-based gates on the server (`requireRole`) as well as in the UI.
- Uploads are restricted to PDF / JPG / PNG, capped at 5 MB, stored outside the web root and
  served only through an authenticated, ownership-checked route.
- Officers cannot register themselves; every verification action is written to an immutable
  audit record naming the officer, their remarks and whether they overrode the system.
- Change `JWT_SECRET` before any deployment.

---

## Branding and emblems

`client/src/components/Emblem.jsx` contains **simplified inline SVG renderings** of the State
Emblem of India and a Ministry device, drawn for this prototype so that no external image is
required. Use of the State Emblem is governed by the State Emblem of India (Prohibition of
Improper Use) Act, 2005 — any real deployment must replace these with the official artwork
supplied by the Ministry.

---

## Known limitations

- OCR is simulated; see the integration point above.
- Seeded applications carry no stored file, so the verification panel shows an explanatory note
  in place of the document preview for those records. Documents you upload yourself render
  normally.
- Hindi covers the interface chrome (header, navigation, landing page); scheme content and
  officer screens remain in English pending certified translation.
- Grievances are stored but have no officer-side workflow.
- Email and SMS notifications are not wired up.
