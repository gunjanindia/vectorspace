# Production Checklist

Before going live:

- [ ] Replace AUTH_SECRET with a strong random secret.
- [ ] Use managed PostgreSQL or hardened PostgreSQL.
- [ ] Run Prisma migrations rather than `db push`.
- [ ] Disable demo credentials.
- [ ] Add email verification and password reset.
- [ ] Add rate limiting to auth endpoints.
- [ ] Add CSRF/origin protections where appropriate.
- [ ] Configure Razorpay server-side order creation, signature verification and webhooks.
- [ ] Add GST invoice logic if applicable.
- [ ] Put course videos in object storage and serve HLS through a CDN.
- [ ] Add signed/expiring media URLs.
- [ ] Add backups and monitoring.
- [ ] Configure HTTPS.
- [ ] Add audit logs for admin actions.
- [ ] Add privacy policy, terms, refund policy and consent flows.
- [ ] Test payment failure/refund/webhook retry cases.
- [ ] Run dependency/security scans.
