import { useState } from "react";
import { findSessionByHn, requestCorrection } from "../coordination/api";
import type { CorrectionReason, StaffProfile } from "../coordination/types";
import DoctorSessionPanel from "./DoctorSessionPanel";
import PharmacySessionPanel from "./PharmacySessionPanel";

export default function StaffCoordination({
  lang,
  profile,
}: {
  lang: "th" | "en";
  profile: StaffProfile;
}) {
  const [sessionId, setSessionId] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const heading =
    profile.role === "pharmacist"
      ? lang === "th"
        ? "ค้นหา session วันนี้"
        : "Find Today's Session"
      : lang === "th"
        ? "เปิดหรือสร้าง session วันนี้"
        : "Open Or Create Today's Session";

  const handleOpenSession = async (hn: string) => {
    setLoading(true);
    setError("");
    setStatusMessage("");
    try {
      const clinicDate = new Date().toISOString().slice(0, 10);
      const result = await findSessionByHn(hn, clinicDate);
      if (result.found && result.sessionId) {
        setSessionId(result.sessionId);
        setStatusMessage(
          lang === "th"
            ? "พบ session วันนี้สำหรับ HN นี้"
            : "Found today's session for this HN",
        );
      } else {
        setSessionId("");
        setStatusMessage(
          profile.role === "doctor"
            ? lang === "th"
              ? "ยังไม่มี session วันนี้ แพทย์สามารถสร้างเมื่อบันทึกแผนยา"
              : "No session today. Create one when saving a medication plan."
            : lang === "th"
              ? "ไม่พบ session วันนี้สำหรับ HN นี้"
              : "No active session found for this HN today",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCorrection = async (reason: CorrectionReason, note: string) => {
    if (!sessionId) {
      setError(lang === "th" ? "กรุณาค้นหา session ก่อน" : "Find a session first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await requestCorrection(sessionId, reason, note, profile.userId);
      setStatusMessage(lang === "th" ? "ส่งคำขอแก้ไขให้แพทย์แล้ว" : "Correction request sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">
            {lang === "th" ? "ประสานงานแพทย์-เภสัช" : "Doctor-Pharmacy Coordination"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            <span>{profile.displayName}</span> · <span>{profile.role}</span>
          </p>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="text-sm font-extrabold text-clinic-ink">{heading}</h3>
        {statusMessage && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
            {statusMessage}
          </p>
        )}
        {profile.role === "pharmacist" ? (
          <PharmacySessionPanel
            lang={lang}
            loading={loading}
            error={error}
            onFindSession={handleOpenSession}
            onRequestCorrection={handleCorrection}
          />
        ) : (
          <DoctorSessionPanel lang={lang} loading={loading} error={error} onOpenSession={handleOpenSession} />
        )}
      </div>
    </div>
  );
}
