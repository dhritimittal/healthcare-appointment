import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DoctorCreationForm from "./components/DoctorCreationForm";
import LeaveDayForm from "./components/LeaveDayForm";

export default async function AdminPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/login");

  return (
    <main className="max-w-3xl mx-auto py-16 px-4">
      <h1 className="text-2xl font-bold mb-2">Admin Portal</h1>
      <p className="text-slate-600 mb-8">Logged in as {session.user?.email}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DoctorCreationForm />
        <LeaveDayForm />
      </div>
    </main>
  );
}
