# Vector Space Skills Academy — Version 1

A working LMS foundation for **Vector Space Skills Academy** with:

- Public homepage
- Course catalogue
- Course detail pages
- Student registration/login
- Secure HTTP-only JWT session cookie
- Student dashboard
- Course enrollment
- Course player
- Lesson/module data model
- Hybrid/online/offline course modes
- Admin dashboard
- PostgreSQL + Prisma
- Payment/order architecture
- Development payment confirmation
- Seed data

## Technology

- Next.js App Router
- React
- TypeScript
- PostgreSQL
- Prisma
- bcrypt
- jose

Next.js currently documents the App Router as its newer routing model and supports full-stack application development. The official Next.js learning material also demonstrates protected dashboards, authentication and PostgreSQL-backed applications. See the official documentation links below.

## Run locally

Requirements:
- Node.js 20.9+
- Docker Desktop

1. Copy environment file:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

2. Start PostgreSQL:

```bash
docker compose up -d
```

3. Install packages:

```bash
npm install
```

4. Create database schema:

```bash
npx prisma db push
```

5. Seed demo data:

```bash
npm run db:seed
```

6. Start:

```bash
npm run dev
```

Open:

http://localhost:3000

## Demo accounts

Admin:

admin@vectorspaceacademy.com
Admin@12345

Instructor:

instructor@vectorspaceacademy.com
Admin@12345

Change these credentials immediately for any non-development environment.

## Important payment note

Version 1 contains a **development-only simulated payment confirmation** so the entire enrollment workflow can be tested without exposing or requiring payment credentials.

Before production:
- Create orders server-side with Razorpay.
- Open Razorpay Checkout on the client.
- Verify the payment signature on the server.
- Process Razorpay webhooks.
- Make enrollment depend on verified payment status.
- Add refund handling.
- Never expose the Razorpay secret key to the browser.

## Version 2 recommended modules

1. Full admin CRUD for courses/modules/lessons
2. Instructor dashboard
3. Video upload + HLS processing
4. Razorpay production integration
5. Coupons and invoices/GST
6. Quiz engine
7. Assignment/project submission
8. Attendance and classroom batches
9. Certificate PDF generation + public verification
10. Email/WhatsApp notifications
11. AI course assistant using RAG
12. Search/filter/pagination
13. Google login
14. Audit logs and security hardening

## Official technical references

Next.js:
https://nextjs.org/docs

NestJS:
https://docs.nestjs.com/

Prisma:
https://www.prisma.io/docs/

## V1.1 Course Management

The V1.1 update preserves the original V1 navigation and adds Course Management under the existing Admin Dashboard.

Admin routes:
- `/admin` — existing V1 admin dashboard
- `/admin/courses` — course management
- `/admin/courses/new` — create course
- `/admin/courses/[id]` — visual course builder

The Course Builder supports modules, lessons, ordering, lesson types, resource URLs and publishing. No replacement global sidebar is used.

## Google Cloud Platform (GCP) Deployment Guide

This guide covers deploying **Vector Space Skills Academy** to Google Cloud using **Cloud Run** (for the Next.js application) and **Cloud SQL** (for PostgreSQL database).

### Architecture Overview
- **Compute**: Google Cloud Run (Fully managed serverless container runtime)
- **Database**: Cloud SQL for PostgreSQL
- **Container Registry**: Artifact Registry
- **Build Pipeline**: Cloud Build

---

### Prerequisites
1. A Google Cloud Account & active billing project.
2. [Google Cloud SDK (`gcloud` CLI)](https://cloud.google.com/sdk/docs/install) installed locally or Google Cloud Shell.
3. Docker installed locally (if building container images locally).

---

### Step 1: Initialize GCP Project & Enable APIs

Open your terminal or Cloud Shell and run:

```bash
# 1. Login to GCP
gcloud auth login

# 2. Set your active project ID
gcloud config set project YOUR_PROJECT_ID

# 3. Enable required GCP APIs
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

---

### Step 2: Create Cloud SQL (PostgreSQL) Instance

```bash
# 1. Create Cloud SQL PostgreSQL instance
gcloud sql instances create vectorspace-db \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=7680MB \
  --region=us-central1 \
  --root-password="YOUR_SECURE_ROOT_PASSWORD"

# 2. Create application database
gcloud sql databases create vectorspace_db --instance=vectorspace-db

# 3. Create app database user
gcloud sql users create vectorspace_user \
  --instance=vectorspace-db \
  --password="YOUR_SECURE_USER_PASSWORD"

# 4. Get Cloud SQL Instance Connection Name (save this for deployment)
gcloud sql instances describe vectorspace-db --format="value(connectionName)"
# Output format: YOUR_PROJECT_ID:us-central1:vectorspace-db
```

---

### Step 3: Create Dockerfile for Next.js

Create a `Dockerfile` in the root of your project directory:

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json prisma ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./ ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

CMD ["npm", "start"]
```

---

### Step 4: Build & Push Image to Artifact Registry

```bash
# 1. Create Docker repository in Artifact Registry
gcloud artifacts repositories create vectorspace-repo \
  --repository-format=docker \
  --location=us-central1 \
  --description="Vector Space Skills Academy Container Repository"

# 2. Build and submit image via Cloud Build
gcloud builds submit \
  --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/vectorspace-repo/app:latest .
```

---

### Step 5: Run Database Migrations & Seed Data

Connect to Cloud SQL via **Cloud SQL Auth Proxy** from your local machine to push the schema and seed demo accounts:

```bash
# 1. Start Cloud SQL Auth Proxy locally
cloud-sql-proxy YOUR_PROJECT_ID:us-central1:vectorspace-db --port 5432

# 2. Update .env temporarily with Cloud SQL connection string:
DATABASE_URL="postgresql://vectorspace_user:YOUR_SECURE_USER_PASSWORD@localhost:5432/vectorspace_db?schema=public"

# 3. Push schema and seed demo accounts
npx prisma db push
npm run db:seed
```

---

### Step 6: Deploy Application to Google Cloud Run

Deploy the container to Cloud Run and attach the Cloud SQL instance connection:

```bash
gcloud run deploy vectorspace-app \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/vectorspace-repo/app:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances=YOUR_PROJECT_ID:us-central1:vectorspace-db \
  --set-env-vars="NODE_ENV=production,JWT_SECRET=YOUR_RANDOM_LONG_SECRET_KEY,DATABASE_URL=postgresql://vectorspace_user:YOUR_SECURE_USER_PASSWORD@/vectorspace_db?host=/cloudsql/YOUR_PROJECT_ID:us-central1:vectorspace-db"
```

Once deployment completes, Cloud Run will output your live URL (e.g., `https://vectorspace-app-xxxxxx-uc.a.run.app`).

---

### Step 7: Custom Domain Setup (Optional)

To map a custom domain (e.g. `https://academy.yourdomain.com`):

```bash
gcloud run domain-mappings create \
  --service=vectorspace-app \
  --domain=academy.yourdomain.com \
  --region=us-central1
```

Follow the CLI output to configure `CNAME` / `A` records in your DNS provider. Managed SSL certificates are automatically provisioned by Google Cloud.

