"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DoctorCreationForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialisation, setSpecialisation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const defaultWorkingHours = {
    mon: ["09:00", "17:00"],
    tue: ["09:00", "17:00"],
    wed: ["09:00", "17:00"],
    thu: ["09:00", "17:00"],
    fri: ["09:00", "17:00"],
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          specialisation,
          workingHours: defaultWorkingHours,
          slotDurationMin: 30,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create doctor");
      } else {
        setSuccess(`Doctor ${data.doctor.name} created successfully!`);
        setName("");
        setEmail("");
        setPassword("");
        setSpecialisation("");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mt-8">
      <h2 className="text-lg font-semibold mb-4">Create Doctor</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Full Name</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Dr. Jane Doe" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="jane@clinic.test" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="doctor123" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Specialisation</label>
          <input type="text" required value={specialisation} onChange={(e) => setSpecialisation(e.target.value)} className="w-full border rounded-md px-3 py-2" placeholder="Cardiology" />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button type="submit" disabled={loading} className="bg-slate-900 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50">
          {loading ? "Creating..." : "Create Doctor"}
        </button>
      </form>
    </div>
  );
}
