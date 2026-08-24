import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const sess = await getServerSession(authOptions);
  if (!sess || (sess.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "no access" }, { status: 401 });
  }

  const { date } = await req.json();
  if (!date) return NextResponse.json({ error: "date missing" }, { status: 400 });

  const d = new Date(new Date(date).toISOString().split("T")[0]);
  const docId = params.id;
  
  console.log("marking leave for", docId, d);

  await prisma.leaveDay.upsert({
    where: { doctorId_date: { doctorId: docId, date: d } },
    update: {},
    create: { doctorId: docId, date: d },
  });

  const start = d;
  const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);

  const aff = await prisma.appointment.findMany({
    where: {
      doctorId: docId,
      slotStart: { gte: start, lt: end },
      status: { in: ["CONFIRMED", "PENDING_CONFIRMATION"] },
    },
  });

  for (const a of aff) {
    console.log("rescheduling", a.id);
    await prisma.$transaction([
      prisma.appointment.update({
        where: { id: a.id },
        data: { status: "NEEDS_RESCHEDULE" },
      }),
      prisma.notification.create({
        data: {
          userId: a.patientId,
          type: "leave_conflict",
          channel: "email",
          content: `appointment on ${a.slotStart.toDateString()} cancelled. doctor on leave`,
          status: "pending",
        },
      }),
    ]);
  }

  return NextResponse.json({ affectedCount: aff.length });
}
