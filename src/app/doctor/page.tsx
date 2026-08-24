import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import AppointmentItem from "./components/AppointmentItem";

export default async function DoctorPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "DOCTOR") redirect("/login");

  const doctorProfile = await prisma.doctorProfile.findUnique({
    where: { userId: (session.user as any).id },
  });

  const appointments = doctorProfile
    ? await prisma.appointment.findMany({
        where: { doctorId: doctorProfile.id },
        include: { patient: { select: { name: true, email: true } } },
        orderBy: { slotStart: "asc" },
      })
    : [];

  return (
    <main className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Doctor Portal</h1>
      <p className="text-slate-600 mb-8">Logged in as {session.user?.email}</p>

      <h2 className="font-semibold mb-3">Appointments</h2>
      {appointments.length === 0 && <p className="text-slate-500 text-sm">No appointments yet.</p>}
      <ul className="space-y-4">
        {appointments.map((a) => (
          <AppointmentItem key={a.id} appointment={a} />
        ))}
      </ul>
    </main>
  );
}
