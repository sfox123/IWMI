# Data Request Portal

A web form that asks organisations which datasets they hold. Respondents pick their **sectors** first
and only see the data types for those sectors. For each dataset they tick, they add details
(spatial level, countries, frequency, years, format) and can **upload files**. An **admin area**
lets you review every response, browse all datasets and files, track follow-ups and export the
full inventory to Excel (CSV).

Sectors: Climate & Meteorology · Hydrology · Water Resources · Hydropower & Energy ·
Agriculture (Crop, Horticulture, Plantation, Livestock) · Disaster · Health

## Run it

Needs Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local      # then set ADMIN_PASSWORD
npm run dev                     # http://localhost:3000
```

Production: `npm run build && npm start`.

| Page | What it is |
|---|---|
| `/` | The public form |
| `/admin` | Submissions dashboard: stats, filter by sector and status, open a response |
| `/admin/[id]` | One response in full, file downloads, status and internal notes |
| `/admin/datasets` | Every dataset across all responses, plus a "coverage by data type" list showing gaps |
| `/admin/files` | Every uploaded file, with search and download |
| `/api/admin/export` | Download the data inventory as CSV (one row per dataset) |

The admin pages ask for the login in `.env.local` (`ADMIN_USER`, `ADMIN_PASSWORD`).

## Where the data is stored

Right now everything stays **on the server**, inside the `data/` folder:

```
data/
├── portal.db                     ← SQLite database (all form answers)
└── uploads/data-requests/
    └── 2026/09/<submission-id>/
        ├── submission.json       ← full copy of the response
        ├── climate/rainfall/20260923T151135-rainfall.csv
        └── other/other-1/...
```

- **Database** (`data/portal.db`) has three tables:
  - `submissions`: one row per response (contact details, sharing, progress, status)
  - `datasets`: one row per dataset ticked or added
  - `files`: one row per uploaded file, with its path
  
  You can open it with any SQLite tool, for example DB Browser for SQLite.
- **Files** are sorted by year and month, then submission, then sector, then data type, so they stay organised even outside the app.
- **Back up** by copying the whole `data/` folder. The `data/` folder is excluded from git.

## Moving to S3 later

The S3 and DynamoDB code is already written. To switch, set these in `.env.local`:

```
STORAGE_MODE=aws
AWS_REGION=ap-south-1
S3_BUCKET=<bucket>
S3_PREFIX=data-requests
DYNAMODB_TABLE=<table>     # partition key: id (String)
```

The browser then uploads files straight to S3 using short-lived signed links, and records go to
DynamoDB. File paths in S3 follow the same layout as the local folder. To copy existing data across,
run `aws s3 sync data/uploads/ s3://<bucket>/`.

The S3 bucket also needs a CORS rule that allows `PUT` from the site's domain.

## Customising

- **Sectors and data types:** edit `lib/sectors.ts`. Keep existing `id`s unchanged after launch, because stored answers refer to them.
- **Logo:** put the official logo at `public/logo.svg` or `public/logo.png`. It replaces the placeholder in the header automatically.
- **Name:** set `NEXT_PUBLIC_ORG_NAME` and `NEXT_PUBLIC_FORM_TITLE`.
- **Allowed file types and size limit:** `ALLOWED_EXTENSIONS` in `lib/sectors.ts` and `MAX_UPLOAD_MB`.

## Before going live

- Replace the shared admin password with proper sign-in (for example Microsoft Entra ID).
- Put the site behind HTTPS, and add rate limiting on `/api/uploads`, since the form is public.
- Files uploaded by people who never press Submit remain on disk. Clean them up from time to time; in S3, a lifecycle rule can do this automatically.
