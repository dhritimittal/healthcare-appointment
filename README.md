# Healthcare Appointment Manager — Starter Backend

This scaffold contains the **highest-risk, most-graded parts already built**:
double-booking-safe booking, LLM integration with failure handling, doctor
leave conflict handling, role-based auth, and a notification worker pattern.
What's left is mostly UI pages wired to these routes — lower risk, faster to build.

## 1. Setup (do this first, ~15 min)

```bash
npm install
```

Create free accounts and fill in `.env` (copy from `.env.example`):
- **DB**: [neon.tech](https://neon.tech) — new project → copy connection string → `DATABASE_URL`
- **LLM**: [aistudio.google.com/apikey](https://aistudio.google.com/apikey) → `GEMINI_API_KEY`
- **Email**: [resend.com](https://resend.com) → API key → `RESEND_API_KEY` (their test domain works without verifying your own)
- **Auth secret**: run `openssl rand -base64 32` → `NEXTAUTH_SECRET`

```bash
npx prisma migrate dev --name init
npm run prisma:seed   # creates admin@clinic.test / admin123 and doctor@clinic.test / doctor123
npm run dev
```

Test the backend immediately with curl/Postman before building any UI —
this catches schema/env issues early:

```bash
# Login as admin, then create a doctor, then as patient POST /api/book, then /api/symptoms
```

## 2. What's already built

| Piece | File | Notes |
|---|---|---|
| Schema + double-booking constraint | `prisma/schema.prisma` | `@@unique([doctorId, slotStart])` |
| Auth (role-based) | `src/lib/auth.ts` | NextAuth credentials provider |
| Booking (transaction-safe) | `src/app/api/book/route.ts` | Read this file's comments — this is your system-design write-up material |
| Pre-visit LLM summary | `src/app/api/symptoms/route.ts` + `src/lib/gemini.ts` | Booking confirms even if LLM fails |
| Post-visit LLM summary | `src/app/api/visit-notes/route.ts` | Same failure-tolerant pattern |
| Admin doctor CRUD + search | `src/app/api/doctors/route.ts` | |
| Leave day + patient notification | `src/app/api/doctors/[id]/leave/route.ts` | |
| Notification worker (cron) | `src/app/api/reminders/check/route.ts` + `vercel.json` | Runs every 10 min on Vercel |

## 3. What is Built (Completed)

1. **`/login` and `/register` pages** — patient registration and role-based login.
2. **`/patient` portal**:
   - Doctor search and dynamic slot picker based on working hours.
   - Symptom form creating appointments with `PENDING_CONFIRMATION` slot holds.
   - View own appointments.
3. **`/doctor` portal**:
   - View appointments and pre-visit LLM summaries.
   - Submit post-visit clinical notes, kicking off patient-friendly LLM summaries.
4. **`/admin` portal**:
   - Doctor creation form.
   - Leave day marking, which automatically triggers reschedule notifications.

## 4. System Design Write-Up

Please see [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for the full 800-word system design document detailing:
- Double-booking prevention
- Slot holds
- Failure-tolerant AI integration
- Asynchronous notification worker pattern
- Google Calendar integration strategy

## 5. Deploy

```bash
git push  # then import repo in Vercel dashboard
```
Add all `.env` vars in Vercel project settings. Vercel Cron picks up `vercel.json` automatically on the Pro trial or Hobby plan (check current Vercel free-tier cron limits).
