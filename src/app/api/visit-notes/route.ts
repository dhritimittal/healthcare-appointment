import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { callGeminiJSON, postVisitPrompt } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const sess = await getServerSession(authOptions);
  if (!sess || (sess.user as any).role !== "DOCTOR") {
    return NextResponse.json({ error: "no access" }, { status: 401 });
  }

  const { appointmentId, notes, prescription } = await req.json();
  if (!appointmentId || !notes) {
    return NextResponse.json({ error: "missing data" }, { status: 400 });
  }

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { doctor: true },
  });
  if (!appt || appt.doctor.userId !== (sess.user as any).id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  console.log("saving notes for", appointmentId);

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { postVisitNotes: notes, prescription, status: "COMPLETED", postVisitStatus: "pending" },
  });

  const res = await callGeminiJSON(postVisitPrompt(notes));

  if (res.ok) {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { postVisitSummary: res.data, postVisitStatus: "ready" },
    });
    return NextResponse.json({ status: "completed", postVisitSummary: res.data });
  } else {
    console.error("error gemini");
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { postVisitStatus: "failed" },
    });
    return NextResponse.json(
      { status: "completed", postVisitSummary: null, warning: "failed" },
      { status: 200 }
    );
  }
}
