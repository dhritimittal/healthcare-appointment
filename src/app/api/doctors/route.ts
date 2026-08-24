import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET /api/doctors?specialisation=Cardiology  -> public search, used by patients
export async function GET(req: NextRequest) {
  const specialisation = req.nextUrl.searchParams.get("specialisation");
  const doctors = await prisma.doctorProfile.findMany({
    where: specialisation ? { specialisation: { contains: specialisation, mode: "insensitive" } } : undefined,
    include: { user: { select: { name: true, email: true } }, leaveDays: true },
  });
  return NextResponse.json({ doctors });
}

// POST /api/doctors  -> admin creates a doctor profile + login
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, password, specialisation, workingHours, slotDurationMin } = await req.json();
  if (!name || !email || !password || !specialisation || !workingHours) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const doctorUser = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "DOCTOR",
      doctorProfile: {
        create: { specialisation, workingHours, slotDurationMin: slotDurationMin ?? 30 },
      },
    },
    include: { doctorProfile: true },
  });

  return NextResponse.json({ doctor: doctorUser }, { status: 201 });
}
