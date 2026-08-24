"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AppointmentItem({ appointment }: { appointment: any }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(appointment.postVisitNotes || "");
  const [prescription, setPrescription] = useState(appointment.prescription || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isConfirmed = appointment.status === "CONFIRMED";
  const isCompleted = appointment.status === "COMPLETED";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/visit-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id, notes, prescription }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit notes");
      } else {
        setSuccess("Notes saved successfully!");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetrySummary() {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/symptoms/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: appointment.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to regenerate summary");
      } else {
        setSuccess("Summary generated successfully!");
        router.refresh();
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div>
          <p className="font-medium text-lg">
            {appointment.patient.name} <span className="text-sm font-normal text-slate-500 ml-2">— {mounted ? new Date(appointment.slotStart).toLocaleString() : ""}</span>
          </p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium">Status: {appointment.status}</span>
            {appointment.preVisitSummary && (
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                (appointment.preVisitSummary as any).urgency === "HIGH" ? "bg-red-100 text-red-700" :
                (appointment.preVisitSummary as any).urgency === "MEDIUM" ? "bg-orange-100 text-orange-700" :
                "bg-green-100 text-green-700"
              }`}>
                Urgency: {(appointment.preVisitSummary as any).urgency}
              </span>
            )}
          </div>
        </div>
        <div>
          <span className="text-slate-400 text-xl">{expanded ? "↑" : "↓"}</span>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t">
          {appointment.symptomText && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Patient Symptoms</h4>
              <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{appointment.symptomText}</p>
              {appointment.preVisitStatus === "failed" && (
                <div className="mt-2">
                  <p className="text-sm text-red-600 mb-2">⚠️ AI Summary generation failed previously.</p>
                  <button
                    type="button"
                    onClick={handleRetrySummary}
                    disabled={loading}
                    className="text-xs bg-slate-200 text-slate-800 px-3 py-1 rounded font-medium hover:bg-slate-300 disabled:opacity-50"
                  >
                    {loading ? "Retrying..." : "Retry AI Summary"}
                  </button>
                </div>
              )}
            </div>
          )}

          {appointment.preVisitSummary && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-1">Pre-Visit Summary (LLM)</h4>
              <ul className="text-sm text-slate-700 list-disc list-inside bg-slate-50 p-2 rounded">
                <li><strong>Chief Complaint:</strong> {(appointment.preVisitSummary as any).chiefComplaint}</li>
                {((appointment.preVisitSummary as any).suggestedQuestions || []).length > 0 && (
                  <li>
                    <strong>Suggested Questions:</strong>
                    <ul className="list-circle list-inside ml-4">
                      {((appointment.preVisitSummary as any).suggestedQuestions).map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          )}

          {(isConfirmed || isCompleted) && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-6 border-t pt-4">
              <h4 className="text-sm font-semibold">Post-Visit Notes</h4>
              <div>
                <label className="block text-sm font-medium mb-1">Clinical Notes (Required)</label>
                <textarea
                  required
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isCompleted}
                  className="w-full border rounded-md px-3 py-2 h-24 bg-white"
                  placeholder="Patient reports improvement..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Prescription (Optional)</label>
                <textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  disabled={isCompleted}
                  className="w-full border rounded-md px-3 py-2 h-16 bg-white"
                  placeholder="Amoxicillin 500mg..."
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              {success && <p className="text-green-600 text-sm">{success}</p>}
              
              {!isCompleted && (
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-slate-900 text-white rounded-md px-4 py-2 font-medium disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Notes & Complete"}
                </button>
              )}
              {isCompleted && appointment.postVisitSummary && (
                <div className="mt-4 p-3 bg-green-50 text-green-800 text-sm rounded">
                  <h4 className="font-semibold mb-1">Patient-Friendly Summary (LLM)</h4>
                  <p className="mb-2">{(appointment.postVisitSummary as any).summary}</p>
                  {((appointment.postVisitSummary as any).medicationSchedule || []).length > 0 && (
                    <div className="mb-1">
                      <strong>Medication:</strong>
                      <ul className="list-disc list-inside ml-2">
                        {((appointment.postVisitSummary as any).medicationSchedule).map((med: any, i: number) => (
                          <li key={i}>{med.medication} - {med.frequency} for {med.duration}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {((appointment.postVisitSummary as any).followUpSteps || []).length > 0 && (
                    <div>
                      <strong>Follow-up:</strong>
                      <ul className="list-disc list-inside">
                        {((appointment.postVisitSummary as any).followUpSteps).map((step: string, i: number) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </form>
          )}
        </div>
      )}
    </li>
  );
}
