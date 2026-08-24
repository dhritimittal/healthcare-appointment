import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callGeminiJSON, preVisitPrompt } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions);
  if (!sess || (sess.user as any).role !== "PATIENT") {
    return NextResponse.json({ error: "no access" }, { status: 401 });
  }

  const data = await req.json();
  const { appointmentId, symptomText } = data;
  
  if (!appointmentId || !symptomText) {
    return NextResponse.json({ error: "missing data" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt || appt.patientId !== (sess.user as any).id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  console.log("updating appt status", appointmentId);

  await prisma.$transaction([
    prisma.appointment.update({
      where: { id: appointmentId },
      data: { symptomText, status: "CONFIRMED", preVisitStatus: "pending" },
    }),
    prisma.notification.create({
      data: {
        userId: (sess.user as any).id,
        type: "booking_confirmation",
        channel: "email",
        content: `Your appointment on ${appt.slotStart.toDateString()} is confirmed.`,
        status: "pending",
      },
    }),
  ]);

  console.log("calling gemini...");
  const res = await callGeminiJSON(preVisitPrompt(symptomText));

  if (res.ok) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { preVisitSummary: res.data, preVisitStatus: "ready" },
    });
    return NextResponse.json({ status: "confirmed", preVisitSummary: res.data });
  } else {
    console.error("gemini failed :(");
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { preVisitStatus: "failed" },
    });
    return NextResponse.json(
      { status: "confirmed", preVisitSummary: null, warning: "failed" },
      { status: 200 }
    );
  }
}
