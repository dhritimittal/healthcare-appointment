# Healthcare Appointment Manager

A full-stack healthcare appointment platform built with Next.js 14, featuring robust concurrency control, role-based authentication, and AI-powered visit summaries. 

This project was engineered to solve real-world scheduling complexities, prioritizing data integrity (preventing double-bookings), graceful failure handling for third-party APIs, and async background processing.

## 🚀 Tech Stack

- **Framework:** Next.js 14 (App Router), React
- **Language:** TypeScript
- **Database:** PostgreSQL (hosted on Neon)
- **ORM:** Prisma
- **Authentication:** NextAuth.js (Credentials Provider + JWT)
- **AI Integration:** Google Gemini API
- **Email/Notifications:** Resend API

## 🏗️ Architecture & Core Systems

### 1. Concurrency-Safe Booking Engine
Handling simultaneous booking requests is a classic race condition problem. This system prevents double-booking at the database level:
- **Unique Constraints:** The `Appointment` table enforces a strict DB-level `@@unique([doctorId, slotStart])` constraint.
- **Transactions:** The slot availability check and insert operation are wrapped in a single Prisma `$transaction`.
- **Race Condition Handling:** If the transaction window is breached by simultaneous requests, the unique constraint catches the duplicate insert, throwing a `P2002` error which is cleanly caught and presented to the user as a 409 Conflict, ensuring the system never enters an invalid state.

### 2. Failure-Tolerant AI Summaries
The platform uses the Gemini LLM to generate pre-visit symptom analysis and patient-friendly post-visit clinical notes. 
- **Non-blocking critical paths:** The booking confirmation flow must *never* fail just because a third-party AI API is down. If the Gemini API times out or rate-limits, the appointment is still successfully confirmed, and the AI summary is marked as `failed`. 
- **Manual Retries:** Doctors are provided with a UI mechanism to manually regenerate failed LLM summaries later.

### 3. Slot Holds & Background Workers
- **Optimistic Slot Holds:** When a patient selects a time, the slot is immediately created with a `PENDING_CONFIRMATION` status. This reserves the slot while they fill out their symptom forms.
- **Cron Cleanup Job:** A serverless cron job runs periodically to sweep the database, expiring stale holds (older than 15 minutes) and sending queued email notifications (e.g., medication reminders and leave-conflict rescheduling notices).

### 4. Role-Based Access Control (RBAC)
The application defines strict boundaries for three distinct user types:
- **Patients:** Can browse doctors, view available slots dynamically filtered by working hours/leaves, and book appointments.
- **Doctors:** Have a dashboard to view upcoming appointments, read AI-generated symptom summaries, and submit clinical notes.
- **Admins:** Manage clinic staff, onboard new doctors, and mark leave days (which automatically cascades to reschedule overlapping appointments).

## 💻 Local Setup

1. **Clone & Install**
   ```bash
   git clone <your-repo-url>
   cd healthcare-appointment
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file in the root directory (use `.env.example` as a template):
   ```env
   DATABASE_URL="your-neon-postgres-url"
   NEXTAUTH_SECRET="your-random-secret"
   NEXTAUTH_URL="http://localhost:3000"
   GEMINI_API_KEY="your-google-gemini-key"
   RESEND_API_KEY="your-resend-key"
   ```

3. **Database Setup**
   ```bash
   # Apply schema to database
   npx prisma migrate dev --name init
   
   # Seed the database with an Admin and a Doctor account
   npm run prisma:seed
   ```

4. **Run the Development Server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to view the application.

## 🔮 Future Enhancements
- **Google Calendar Integration:** A backend OAuth integration is scoped out (`src/lib/gcal.ts`) to sync confirmed appointments directly to a doctor's primary Google Calendar.
- **WebSockets:** Upgrading the polling/refresh mechanisms to real-time WebSockets for instant booking reflections across clients.
