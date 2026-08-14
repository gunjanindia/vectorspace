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
