import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await req.json();
  const { doctorId, slotStart } = data;
  
  if (!doctorId || !slotStart) {
    return NextResponse.json({ error: "missing stuff" }, { status: 400 });
  }

  console.log("booking slot", slotStart);

  const start = new Date(slotStart);
  const doc = await prisma.doctorProfile.findUnique({ where: { id: doctorId } });
  
  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  
  const end = new Date(start.getTime() + doc.slotDurationMin * 60000);

  const dOnly = new Date(start.toISOString().split("T")[0]);
  const leave = await prisma.leaveDay.findUnique({
    where: { doctorId_date: { doctorId, date: dOnly } },
  });
  if (leave) {
    return NextResponse.json({ error: "Doctor is on leave" }, { status: 409 });
  }

  try {
    const appt = await prisma.$transaction(async (t) => {
      const ex = await t.appointment.findUnique({
        where: { doctorId_slotStart: { doctorId, slotStart: start } },
      });
      if (ex && ex.status !== "CANCELLED") {
        throw new Error("taken");
      }

      return t.appointment.create({
        data: {
          patientId: (session.user as any).id,
          doctorId,
          slotStart: start,
          slotEnd: end,
          status: "PENDING_CONFIRMATION",
        },
      });
    });

    console.log("success");
    return NextResponse.json({ appointment: appt }, { status: 201 });
  } catch (e: any) {
    console.error("error!!", e);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "slot taken" }, { status: 409 });
    }
    if (e.message === "taken") {
      return NextResponse.json({ error: "slot taken" }, { status: 409 });
    }
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}
