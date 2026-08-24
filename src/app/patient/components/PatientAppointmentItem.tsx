"use client";

import { useState, useEffect } from "react";

export default function PatientAppointmentItem({ appointment }: { appointment: any }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <li className="border rounded-md p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-lg">
            Dr. {appointment.doctor.user.name}{" "}
            <span className="text-sm font-normal text-slate-500 ml-2">
              — {mounted ? new Date(appointment.slotStart).toLocaleString() : ""}
            </span>
          </p>
          <div className="flex gap-2 mt-1">
            <span className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-600 font-medium">
              Status: {appointment.status}
            </span>
          </div>
        </div>
      </div>

      {appointment.status === "COMPLETED" && appointment.postVisitSummary && (
        <div className="mt-4 pt-4 border-t">
          <h4 className="text-sm font-semibold mb-2 text-indigo-700">Doctor's Post-Visit Summary</h4>
          <div className="p-3 bg-indigo-50 text-indigo-900 text-sm rounded">
            <p className="mb-2">{(appointment.postVisitSummary as any).summary}</p>
            
            {((appointment.postVisitSummary as any).medicationSchedule || []).length > 0 && (
              <div className="mb-2">
                <strong>Medications:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {((appointment.postVisitSummary as any).medicationSchedule).map((med: any, i: number) => (
                    <li key={i}>{med.medication} - {med.frequency} for {med.duration}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {((appointment.postVisitSummary as any).followUpSteps || []).length > 0 && (
              <div>
                <strong>Follow-up Steps:</strong>
                <ul className="list-disc list-inside ml-2 mt-1">
                  {((appointment.postVisitSummary as any).followUpSteps).map((step: string, i: number) => (
                    <li key={i}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {appointment.status === "COMPLETED" && appointment.postVisitStatus === "failed" && (
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm text-slate-500 italic">
            Your post-visit summary is currently being generated. Please check back later.
          </p>
        </div>
      )}
    </li>
  );
}
