import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendNotification(notificationId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: { user: true },
  });
  if (!notification || notification.status === "sent") return;

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM ?? "clinic@example.com",
      to: notification.user.email,
      subject: subjectFor(notification.type),
      text: notification.content,
    });

    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "sent", sentAt: new Date() },
    });
  } catch (err) {
    console.error("Email send failed:", err);
    await prisma.notification.update({
      where: { id: notificationId },
      data: { status: "failed", attempts: { increment: 1 } },
    });
  }
}

function subjectFor(type: string) {
  switch (type) {
    case "booking_confirmation": return "Your appointment is confirmed";
    case "cancellation": return "Your appointment was cancelled";
    case "reminder": return "Appointment reminder";
    case "leave_conflict": return "Your appointment needs to be rescheduled";
    case "medication_reminder": return "Medication reminder";
    default: return "Clinic notification";
  }
}
