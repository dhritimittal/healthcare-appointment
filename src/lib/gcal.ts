import { google } from "googleapis";

// NOTE: This is the scoped-down deliverable version of the GCal integration.
// The OAuth consent screen is not fully wired, but the backend logic is complete.
// A production deployment would require setting up the OAuth client in GCP.

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID || "mock-client-id",
  process.env.GOOGLE_CLIENT_SECRET || "mock-client-secret",
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback"
);

/**
 * Creates a Google Calendar event for a confirmed appointment.
 * Requires the doctor to have connected their Google account and stored a refreshToken.
 */
export async function createCalendarEvent(
  doctorRefreshToken: string,
  appointmentDetails: {
    patientName: string;
    slotStart: Date;
    slotEnd: Date;
    description?: string;
  }
) {
  try {
    oauth2Client.setCredentials({ refresh_token: doctorRefreshToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: `Appointment: ${appointmentDetails.patientName}`,
      description: appointmentDetails.description || "Healthcare appointment",
      start: {
        dateTime: appointmentDetails.slotStart.toISOString(),
      },
      end: {
        dateTime: appointmentDetails.slotEnd.toISOString(),
      },
      // Send updates/invitations if we were adding patient email as attendee
      // attendees: [{ email: patientEmail }],
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    console.log("Calendar event created:", response.data.htmlLink);
    return response.data;
  } catch (error) {
    console.error("Failed to create GCal event:", error);
    // Fail gracefully so we don't break the booking flow if GCal is down
    return null;
  }
}

/**
 * Generates the OAuth URL to redirect the doctor to Google consent screen.
 */
export function getGoogleAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: "offline", // Required to get a refresh token
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    prompt: "consent", // Force consent screen to guarantee refresh token
  });
}
