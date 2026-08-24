import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const dateParam = req.nextUrl.searchParams.get("date");
  if (!dateParam) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const date = new Date(dateParam);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: "invalid date format" }, { status: 400 });
  }

  const doctorId = params.id;
  const doctor = await prisma.doctorProfile.findUnique({
    where: { id: doctorId },
    include: { leaveDays: true },
  });

  if (!doctor) {
    return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
  }

  // Check if it's a leave day
  const dateString = date.toISOString().split("T")[0];
  const isLeaveDay = doctor.leaveDays.some(
    (ld) => ld.date.toISOString().split("T")[0] === dateString
  );

  if (isLeaveDay) {
    return NextResponse.json({ slots: [] }); // No slots available on leave day
  }

  const daysOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const dayName = daysOfWeek[date.getDay()];
  const workingHours = doctor.workingHours as Record<string, [string, string]>;
  const todayHours = workingHours[dayName];

  if (!todayHours || todayHours.length !== 2) {
    return NextResponse.json({ slots: [] }); // Not working today
  }

  const [startStr, endStr] = todayHours;
  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const dayStartTime = new Date(startOfDay);
  dayStartTime.setHours(startH, startM, 0, 0);

  const dayEndTime = new Date(startOfDay);
  dayEndTime.setHours(endH, endM, 0, 0);

  const slotDurationMs = doctor.slotDurationMin * 60 * 1000;

  // Generate all possible slots for the day
  const possibleSlots: Date[] = [];
  let currentTime = new Date(dayStartTime);

  while (currentTime.getTime() + slotDurationMs <= dayEndTime.getTime()) {
    possibleSlots.push(new Date(currentTime));
    currentTime = new Date(currentTime.getTime() + slotDurationMs);
  }

  // Fetch existing appointments to filter out booked slots
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

  const existingAppointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStart: {
        gte: startOfDay,
        lte: endOfDay,
      },
      status: {
        in: ["CONFIRMED", "PENDING_CONFIRMATION"],
      },
    },
  });

  const bookedStartTimes = existingAppointments.map((appt) => appt.slotStart.getTime());

  const availableSlots = possibleSlots.filter((slot) => {
    return !bookedStartTimes.includes(slot.getTime());
  });

  return NextResponse.json({
    slots: availableSlots.map((s) => s.toISOString()),
    slotDurationMin: doctor.slotDurationMin,
  });
}
