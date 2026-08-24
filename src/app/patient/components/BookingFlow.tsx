"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function BookingFlow() {
  const router = useRouter();
  const [specialisation, setSpecialisation] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  
  const [appointmentId, setAppointmentId] = useState("");
  const [symptomText, setSymptomText] = useState("");
  
  const [step, setStep] = useState(1); // 1: Search, 2: Slots, 3: Symptoms, 4: Done
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/doctors?specialisation=${encodeURIComponent(specialisation)}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (err) {
      setError("Failed to search doctors");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSlots(doctorId: string, dateStr: string) {
    if (!doctorId || !dateStr) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/doctors/${doctorId}/slots?date=${dateStr}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSlots(data.slots || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch slots");
    } finally {
      setLoading(false);
    }
  }

  async function handleBookSlot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: selectedDoctorId, slotStart: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError(data.error || "This slot was just booked. Please pick another.");
          // Refresh slots
          fetchSlots(selectedDoctorId, date);
          setSelectedSlot("");
        } else {
          throw new Error(data.error || "Failed to book");
        }
        setLoading(false);
        return;
      }
      setAppointmentId(data.appointment.id);
      setStep(3);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleSymptoms(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/symptoms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId, symptomText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit symptoms");
      setStep(4);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm mt-8">
      <h2 className="text-lg font-semibold mb-4">Book an Appointment</h2>
      
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded text-sm">{error}</div>}

      {step === 1 && (
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search by Specialisation</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={specialisation}
                onChange={(e) => setSpecialisation(e.target.value)}
                className="flex-1 border rounded-md px-3 py-2"
                placeholder="e.g. Cardiology"
              />
              <button type="submit" disabled={loading} className="bg-slate-900 text-white rounded-md px-4 py-2 font-medium">
                {loading ? "Searching..." : "Search"}
              </button>
            </div>
          </div>
          {doctors.length > 0 && (
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Select a Doctor</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setStep(2);
                }}
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
          )}
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleBookSlot} className="space-y-4">
          <button type="button" onClick={() => setStep(1)} className="text-sm text-slate-500 hover:underline">
            &larr; Back to search
          </button>
          <div>
            <label className="block text-sm font-medium mb-1">Select Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                fetchSlots(selectedDoctorId, e.target.value);
              }}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>
          {date && (
            <div>
              <label className="block text-sm font-medium mb-2">Available Slots</label>
              {slots.length === 0 ? (
                <p className="text-sm text-slate-500">No slots available on this date.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots.map((slot) => {
                    const time = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2 px-3 text-sm border rounded-md ${
                          selectedSlot === slot ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 hover:border-slate-400"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !selectedSlot}
            className="w-full bg-slate-900 text-white rounded-md py-2 font-medium disabled:opacity-50 mt-4"
          >
            {loading ? "Holding Slot..." : "Continue"}
          </button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={handleSymptoms} className="space-y-4">
          <div className="p-3 bg-blue-50 text-blue-800 text-sm rounded">
            Slot held! Please describe your symptoms to confirm the booking.
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">What are your symptoms or reason for visit?</label>
            <textarea
              required
              value={symptomText}
              onChange={(e) => setSymptomText(e.target.value)}
              className="w-full border rounded-md px-3 py-2 h-24"
              placeholder="I've been having mild chest pain since yesterday..."
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 text-white rounded-md py-2 font-medium disabled:opacity-50"
          >
            {loading ? "Confirming..." : "Confirm Booking"}
          </button>
        </form>
      )}

      {step === 4 && (
        <div className="text-center py-8">
          <div className="text-green-600 text-4xl mb-4">✓</div>
          <h3 className="text-xl font-bold mb-2">Booking Confirmed</h3>
          <p className="text-slate-600 mb-6">Your appointment has been successfully booked.</p>
          <button
            onClick={() => {
              setStep(1);
              setSpecialisation("");
              setDoctors([]);
              setSelectedDoctorId("");
              setDate("");
              setSlots([]);
              setSelectedSlot("");
              setSymptomText("");
            }}
            className="text-slate-900 font-medium hover:underline"
          >
            Book another appointment
          </button>
        </div>
      )}
    </div>
  );
}
