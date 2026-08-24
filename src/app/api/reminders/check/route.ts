import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/email";

export async function GET() {
  const p = await prisma.notification.findMany({
    where: { status: "pending", attempts: { lt: 2 } },
    take: 50,
  });
  
  for (const n of p) {
    await sendNotification(n.id);
  }

  const c = new Date(Date.now() - 15 * 60 * 1000);
  const exp = await prisma.appointment.updateMany({
    where: { status: "PENDING_CONFIRMATION", createdAt: { lt: c } },
    data: { status: "CANCELLED" },
  });

  const meds = await prisma.appointment.findMany({
    where: { prescription: { not: null }, status: "COMPLETED" },
    take: 50,
  });
  
  for (const a of meds) {
    const sent = await prisma.notification.findFirst({
      where: { userId: a.patientId, type: "medication_reminder", createdAt: { gt: c } },
    });
    if (!sent) {
      await prisma.notification.create({
        data: {
          userId: a.patientId,
          type: "medication_reminder",
          channel: "email",
          content: `Take meds: ${a.prescription}`,
          status: "pending",
        },
      });
    }
  }

  console.log("cron ran");
  return NextResponse.json({ sent: p.length, expired: exp.count });
}
