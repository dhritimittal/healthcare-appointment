"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LeaveDayForm() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function fetchDoctors() {
      try {
        const res = await fetch("/api/doctors");
        const data = await res.json();
        if (res.ok && data.doctors) {
          setDoctors(data.doctors);
        }
      } catch (err) {
        console.error("Failed to fetch doctors");
      }
    }
    fetchDoctors();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    if (!selectedDoctorId) {
      setError("Please select a doctor");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/doctors/${selectedDoctorId}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to mark leave day");
      } else {
        setSuccess(`Leave marked! ${data.affectedCount} appointment(s) need reschedule.`);
        setDate("");
        setSelectedDoctorId("");
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
      <h2 className="text-lg font-semibold mb-4">Mark Doctor Leave</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Doctor</label>
          <select
            value={selectedDoctorId}
            onChange={(e) => setSelectedDoctorId(e.target.value)}
            className="w-full border rounded-md px-3 py-2 bg-white"
            required
          >
            <option value="" disabled>Select a doctor</option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.user.name} ({doc.specialisation})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && <p className="text-green-600 text-sm">{success}</p>}
        <button type="submit" disabled={loading} className="bg-slate-900 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50">
          {loading ? "Marking..." : "Mark Leave"}
        </button>
      </form>
    </div>
  );
}
