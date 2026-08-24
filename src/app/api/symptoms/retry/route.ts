import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callGeminiJSON, preVisitPrompt } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions);
  if (!sess || (sess.user as any).role !== "DOCTOR") {
    return NextResponse.json({ error: "no access" }, { status: 401 });
  }

  const { appointmentId } = await req.json();
  if (!appointmentId) {
    return NextResponse.json({ error: "missing id" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true },
  });

  if (!appt || appt.doctor.userId !== (sess.user as any).id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!appt.symptomText) {
    return NextResponse.json({ error: "no text" }, { status: 400 });
  }

  console.log("retrying for", appointmentId);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { preVisitStatus: "pending" },
  });

  const res = await callGeminiJSON(preVisitPrompt(appt.symptomText));

  if (res.ok) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { preVisitSummary: res.data, preVisitStatus: "ready" },
    });
    return NextResponse.json({ status: "success", preVisitSummary: res.data });
  } else {
    console.log("failed again");
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { preVisitStatus: "failed" },
    });
    return NextResponse.json({ error: "failed again" }, { status: 500 });
  }
}
