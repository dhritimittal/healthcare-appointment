# Healthcare Appointment Manager - System Design

## 1. Double-Booking Prevention Strategy

A core requirement of any healthcare appointment system is the strict prevention of double bookings. This system employs a robust, defense-in-depth strategy to ensure that a doctor cannot be double-booked for the same time slot, even under high concurrency or race conditions.

**Database-Level Guarantees**
The most critical line of defense is at the database level. In our `prisma/schema.prisma`, the `Appointment` model enforces a unique constraint on the combination of a doctor and a specific slot start time:
`@@unique([doctorId, slotStart])`

This guarantees that the database engine itself will reject any attempt to insert a second appointment for the same doctor at the same time. Application-level locks or checks are inherently vulnerable to race conditions in a distributed environment (e.g., when scaled across multiple serverless functions), but the database constraint provides an absolute source of truth.

**Transactional Slot Checks**
While the database constraint is the ultimate safety net, relying on it alone for standard operations is poor practice. Therefore, the booking logic in `POST /api/book` wraps the slot availability check and the appointment creation within a single database transaction (`prisma.$transaction`). 

1. The transaction first queries if an appointment exists for the `doctorId` and `slotStart` (where status is not cancelled).
2. If the slot is taken, the transaction aborts with a `SLOT_TAKEN` error.
3. If free, it creates the appointment.

Because this happens within a transaction, two concurrent requests cannot both pass the read check before either has inserted. If the transaction isolation fails or a race condition still occurs, the unique constraint violation (`PrismaClientKnownRequestError` with code `P2002`) acts as a belt-and-braces fallback. The application catches this specific error code and translates it into a graceful HTTP 409 Conflict response, instructing the UI to prompt the patient to select another slot. This ensures correctness without causing unhandled server errors (HTTP 500).

## 2. Slot Holds and the Booking Flow

To provide a smooth user experience, patients are required to fill out a symptom form before an appointment is fully confirmed. However, the system must guarantee that the slot they selected is not snatched by another user while they are typing.

This is achieved using a "slot hold" mechanism:
- When a patient selects a slot, `POST /api/book` immediately creates an `Appointment` record with the status `PENDING_CONFIRMATION`.
- This record occupies the slot in the database, activating the unique constraint to block others.
- The patient then submits the symptom form via `POST /api/symptoms`, which updates the status from `PENDING_CONFIRMATION` to `CONFIRMED`.

To prevent malicious or distracted users from indefinitely holding slots (e.g., if they close their browser halfway through), a background worker regularly sweeps the database. Stale `PENDING_CONFIRMATION` records older than 15 minutes are automatically purged or expired, freeing up the slot for other patients.

## 3. Failure-Tolerant AI Integration

The system leverages a Large Language Model (Google Gemini) for two key features:
1. **Pre-visit Summaries:** Summarizing the patient's symptom text, extracting the chief complaint, assessing urgency, and suggesting follow-up questions for the doctor.
2. **Post-visit Summaries:** Translating the doctor's clinical notes into a patient-friendly summary with medication schedules and follow-up steps.

External API calls (like LLMs) are inherently prone to latency spikes, timeouts, and temporary outages. The system's design dictates that an LLM failure must *never* block the core business workflow. 

In `POST /api/symptoms`, the database update that confirms the appointment is executed *before* the LLM is invoked. If the Gemini API call fails, the appointment remains confirmed. The `preVisitStatus` is simply marked as `failed`, and a warning is returned. The doctor's portal is designed to handle this gracefully, allowing the summary to be regenerated later asynchronously. The same resilient pattern applies to post-visit notes.

## 4. Notification Worker Pattern

Reliable communication (confirmations, cancellations, reminders) is essential. Instead of sending emails inline synchronously during API requests (which delays responses and risks silent failures if the email provider times out), the system employs an asynchronous worker pattern.

1. **Stored Rows:** When an event occurs (e.g., a doctor marks a leave day, forcing reschedules), the system creates `Notification` rows in the database within the same transaction that modifies the appointments. 
2. **Decoupled Delivery:** A cron-triggered endpoint (`GET /api/reminders/check`) runs every 10 minutes. It fetches pending notifications, attempts delivery via Resend, and updates the status to `sent` or increments an `attempts` counter if it fails.
3. **Resilience:** This pattern ensures zero lost messages. If the email provider is down, the notifications remain `pending` and will be retried on the next cron execution until they succeed or hit a maximum retry limit. 

## 5. Doctor Leave Conflict Handling

When an admin marks a day as leave for a doctor via `POST /api/doctors/[id]/leave`, the system must handle existing appointments gracefully. The endpoint identifies all `CONFIRMED` or `PENDING_CONFIRMATION` appointments on that date. 

It processes them in a transaction:
1. Updating the appointment status to `NEEDS_RESCHEDULE`.
2. Queuing a `Notification` for the affected patient explaining the cancellation and requesting they rebook.

This batch processing ensures data consistency between the doctor's schedule and patient notifications.

## 6. Google Calendar Integration Strategy (Scoped)

While full Google Calendar integration for all users is out of scope for the initial deliverable due to time constraints, the architecture supports it. 

The strategy focuses exclusively on the `DOCTOR` role. During onboarding, doctors would authenticate via OAuth 2.0 (using the `googleapis` package). Their `refresh_token` would be stored securely. 

When a patient's appointment reaches the `CONFIRMED` state, the server would use the doctor's stored refresh token to insert an event directly into the doctor's Google Calendar. By limiting this to doctors, we avoid the complexity of managing OAuth consent and calendar synchronization for thousands of transient patient accounts, keeping the integration targeted and manageable.
