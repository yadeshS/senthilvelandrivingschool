# Senthil Velan Driving School

Internal management portal and public-facing website for Senthil Velan Driving School. Built with Next.js, Supabase, and deployed on Vercel.

---

## What it does

- **Public website** — homepage with contact info and a portal CTA
- **Customer portal** — customers can sign up, log in, and book lessons
- **Staff portal** — manage customers, bookings, records (Sarathi services), and document uploads
- **Owner dashboard** — revenue overview, desk entries, driver sessions, and team management
- **Driver dashboard** — view assigned sessions and track progress
- **Auth** — password login, email OTP, MFA (TOTP) enforced for staff and owner, idle auto-logout

---

## Tech stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database & Auth | Supabase (Postgres + Auth + RLS) |
| File storage | AWS S3 (customer documents) |
| Deployment | Vercel |
| Analytics | Microsoft Clarity |

---

## Local setup

**1. Clone and install**

```bash
git clone https://github.com/yadeshS/senthilvelandrivingschool.git
cd senthilvelandrivingschool
npm install
```

**2. Set up environment variables**

Create a `.env.local` file in the root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_s3_region
AWS_S3_BUCKET=your_s3_bucket_name
```

> Get Supabase values from your project dashboard under **Settings → API**.
> Get AWS values from IAM in the AWS console.

**3. Run the dev server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## User roles

| Role | Access |
|---|---|
| `customer` | Book lessons, view own records |
| `driver` | View assigned sessions |
| `staff` | Full portal: customers, bookings, records, documents |
| `owner` | Everything + team management, revenue dashboard |

Staff and owner accounts require **TOTP MFA** on every login.

---

## Releasing a new version

1. Make your changes on `main`
2. Add a new section to `CHANGELOG.md`
3. Bump the version in `package.json`
4. Commit and tag:

```bash
git add CHANGELOG.md package.json
git commit -m "chore: release vX.Y.Z"
git tag vX.Y.Z
git push origin main --tags
```

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

---

## Deployment

The project auto-deploys to Vercel on every push to `main`. No manual steps needed.
To deploy manually: `vercel --prod`
