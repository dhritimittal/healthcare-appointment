import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import BookingFlow from "./components/BookingFlow";
import PatientAppointmentItem from "./components/PatientAppointmentItem";

export default async function PatientPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "PATIENT") redirect("/login");

  const myAppointments = await prisma.appointment.findMany({
    where: { patientId: (session.user as any).id },
    include: { doctor: { include: { user: { select: { name: true } } } } },
    orderBy: { slotStart: "asc" },
  });

  return (
    <main className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Patient Portal</h1>
      <p className="text-slate-600 mb-8">Logged in as {session.user?.email}</p>

      <h2 className="font-semibold mb-3">My Appointments</h2>
      {myAppointments.length === 0 && <p className="text-slate-500 text-sm">No appointments yet.</p>}
      <ul className="space-y-4 mb-8">
        {myAppointments.map((a) => (
          <PatientAppointmentItem key={a.id} appointment={a} />
        ))}
      </ul>

      <BookingFlow />
    </main>
  );
}
