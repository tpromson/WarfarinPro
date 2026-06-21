import { useEffect, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import {
  findSessionByHn,
  loadClinicSession,
  loadTodayClinicSessions,
  requestCorrection,
} from "../coordination/api";
import type { ClinicSession, CorrectionReason, StaffProfile } from "../coordination/types";
import DoctorSessionPanel from "./DoctorSessionPanel";
import MedicationSheet from "./MedicationSheet";
import PharmacySessionPanel from "./PharmacySessionPanel";

function getLocalClinicDate(): string {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

function shortSessionId(id: string): string {
  return id.replace(/^session-/, "").slice(-6);
}

function sessionReviewTime(session: ClinicSession): string {
  const reviewedAt = session.physicianReviewedAt ?? session.pharmacyReviewedAt ?? session.dispensedAt;
  if (!reviewedAt) return "-";
  return new Date(reviewedAt).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
  const [session, setSession] = useState<ClinicSession | null>(null);
  const [todaySessions, setTodaySessions] = useState<ClinicSession[]>([]);
  const [worklistLoading, setWorklistLoading] = useState(true);
  const [worklistError, setWorklistError] = useState("");
  const [matchedSessionId, setMatchedSessionId] = useState("");
  const [printSheetOpen, setPrintSheetOpen] = useState(false);
  const [printLayout, setPrintLayout] = useState<"half-a4" | "label">("half-a4");
  const heading =
    profile.role === "pharmacist"
      ? lang === "th"
        ? "ค้นหา session วันนี้"
        : "Find Today's Session"
      : lang === "th"
        ? "เปิดหรือสร้าง session วันนี้"
        : "Open Or Create Today's Session";

  useEffect(() => {
    let active = true;

    loadTodayClinicSessions(getLocalClinicDate())
      .then((sessions) => {
        if (active) setTodaySessions(sessions);
      })
      .catch((err) => {
        if (active) setWorklistError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setWorklistLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleOpenSession = async (hn: string) => {
    setLoading(true);
    setError("");
    setStatusMessage("");
    setSession(null);
    setMatchedSessionId("");
    setPrintSheetOpen(false);
    try {
      const clinicDate = getLocalClinicDate();
      const result = await findSessionByHn(hn, clinicDate);
      if (result.found && result.sessionId) {
        const loadedSession = await loadClinicSession(result.sessionId);
        setSessionId(result.sessionId);
        setSession(loadedSession);
        setMatchedSessionId(result.sessionId);
        setTodaySessions((current) => {
          const withoutLoaded = current.filter((item) => item.id !== loadedSession.id);
          return [loadedSession, ...withoutLoaded];
        });
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

  const handleSelectSession = (selectedSession: ClinicSession) => {
    setSessionId(selectedSession.id);
    setSession(selectedSession);
    setMatchedSessionId(selectedSession.id);
    setPrintSheetOpen(false);
    setStatusMessage(
      lang === "th"
        ? `เปิด session #${shortSessionId(selectedSession.id)}`
        : `Opened session #${shortSessionId(selectedSession.id)}`,
    );
  };

  const handleOpenPrintFromSession = (selectedSession: ClinicSession) => {
    handleSelectSession(selectedSession);
    setPrintSheetOpen(true);
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
      setSession((current) => (current ? { ...current, status: "correction_requested" } : current));
      setPrintSheetOpen(false);
      setStatusMessage(lang === "th" ? "ส่งคำขอแก้ไขให้แพทย์แล้ว" : "Correction request sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const currentPlan = session?.currentPlan ?? null;
  const printBlocked = session?.status === "correction_requested";
  const canOpenPrintSheet = Boolean(currentPlan && !printBlocked);

  return (
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5">
      <div className="print:hidden">
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
          <section className="space-y-3 rounded-2xl border border-clinic-line bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-clinic-ink">
                  {lang === "th" ? "Session วันนี้" : "Today's sessions"}
                </h3>
                <p className="text-[11px] font-bold text-slate-500">
                  {lang === "th"
                    ? "แสดงเฉพาะข้อมูลประสานงาน ไม่แสดง HN ตรง ๆ"
                    : "Coordination-only worklist. Plain HN is not displayed."}
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-slate-500">
                {worklistLoading
                  ? lang === "th"
                    ? "กำลังโหลด..."
                    : "Loading..."
                  : `${todaySessions.length} session${todaySessions.length === 1 ? "" : "s"}`}
              </span>
            </div>
            {worklistError && <p className="text-xs font-bold text-clinic-red">{worklistError}</p>}
            {todaySessions.length === 0 && !worklistLoading ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                {lang === "th" ? "ยังไม่มี session วันนี้" : "No sessions today"}
              </p>
            ) : null}
            <div className="space-y-2">
              {todaySessions.map((item) => {
                const itemCanPrint = Boolean(item.currentPlan && item.status !== "correction_requested");
                const isMatched = item.id === matchedSessionId;
                return (
                  <article
                    key={item.id}
                    className={`rounded-xl border p-3 ${
                      isMatched ? "border-clinic-blue bg-clinic-cyan/10" : "border-clinic-line bg-slate-50"
                    }`}
                  >
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-center">
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          {lang === "th" ? "อ้างอิง" : "Reference"}
                        </p>
                        <p className="text-sm font-extrabold text-clinic-ink">
                          session #{shortSessionId(item.id)}
                        </p>
                        {isMatched && (
                          <span className="mt-1 inline-block rounded-full bg-clinic-blue px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {lang === "th" ? "ตรงกับ HN ที่ค้นหา" : "Matched searched HN"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          {lang === "th" ? "สถานะ" : "Status"}
                        </p>
                        <p className="text-sm font-extrabold text-clinic-ink">{item.status}</p>
                        {item.status === "correction_requested" && (
                          <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold text-amber-800">
                            {lang === "th" ? "รอแพทย์แก้ไข" : "Correction pending"}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                          {lang === "th" ? "แผนยา / เวลา" : "Plan / time"}
                        </p>
                        <p className="text-sm font-extrabold text-clinic-ink">
                          {item.currentPlan?.wCode ?? (lang === "th" ? "ยังไม่มีแผนยา" : "No plan yet")}
                        </p>
                        <p className="text-[11px] font-bold text-slate-500">{sessionReviewTime(item)}</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:min-w-[170px]">
                        <button className="icon-button justify-center" onClick={() => handleSelectSession(item)} type="button">
                          {lang === "th" ? "เปิด" : "Open"}
                        </button>
                        <button
                          className="icon-button justify-center"
                          disabled={!itemCanPrint}
                          onClick={() => handleOpenPrintFromSession(item)}
                          type="button"
                          aria-label={
                            lang === "th"
                              ? `เปิดใบยา session #${shortSessionId(item.id)}`
                              : `Open sheet session #${shortSessionId(item.id)}`
                          }
                        >
                          <FileText size={16} />
                          {lang === "th" ? "เปิดใบยา" : "Open sheet"}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
          <h3 className="text-sm font-extrabold text-clinic-ink">{heading}</h3>
          {statusMessage && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
              {statusMessage}
            </p>
          )}
          {session && (
            <section className="grid gap-3 rounded-2xl border border-clinic-line bg-white p-4 shadow-soft sm:grid-cols-[1fr_1fr_1fr_auto]">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  {lang === "th" ? "สถานะ" : "Status"}
                </p>
                <p className="text-sm font-extrabold text-clinic-ink">
                  {lang === "th" ? "สถานะ session" : "Session status"}: {session.status}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  {lang === "th" ? "แผนยา" : "Medication plan"}
                </p>
                <p className="text-sm font-extrabold text-clinic-ink">
                  {session.currentPlan?.wCode ?? (lang === "th" ? "ยังไม่มีแผนยา" : "No plan yet")}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  {lang === "th" ? "วันคลินิก" : "Clinic date"}
                </p>
                <p className="text-sm font-extrabold text-clinic-ink">{session.clinicDate}</p>
              </div>
              <div className="flex items-end">
                <button
                  className="icon-button w-full justify-center"
                  disabled={!canOpenPrintSheet}
                  onClick={() => setPrintSheetOpen(true)}
                  type="button"
                >
                  <FileText size={16} />
                  {lang === "th" ? "เปิดใบยาเพื่อพิมพ์" : "Open printable sheet"}
                </button>
              </div>
            </section>
          )}
          {printBlocked && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
              {lang === "th"
                ? "มีคำขอแก้ไขค้างอยู่ รอแพทย์ approve/revise ก่อนพิมพ์จ่าย"
                : "A correction is pending. Wait for physician approval or revision before dispensing."}
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
      <div className="space-y-3">
        {printSheetOpen && currentPlan && (
          <section className="space-y-3 rounded-2xl border border-clinic-line bg-white p-4 shadow-soft">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between print:hidden">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  {lang === "th" ? "ใบยาพร้อมพิมพ์" : "Printable medication sheet"}
                </p>
                <p className="text-sm font-extrabold text-clinic-ink">{currentPlan.wCode}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <label className="field min-w-[160px]">
                  {lang === "th" ? "รูปแบบ" : "Layout"}
                  <select
                    value={printLayout}
                    onChange={(event) => setPrintLayout(event.target.value as typeof printLayout)}
                  >
                    <option value="half-a4">{lang === "th" ? "ครึ่ง A4" : "Half A4"}</option>
                    <option value="label">{lang === "th" ? "ฉลากยา" : "Label"}</option>
                  </select>
                </label>
                <button className="icon-button justify-center" onClick={() => window.print()} type="button">
                  <Printer size={16} />
                  {lang === "th" ? "พิมพ์ใบยา" : "Print sheet"}
                </button>
                <button
                  className="icon-button justify-center bg-slate-100 text-slate-700 hover:bg-slate-200"
                  onClick={() => setPrintSheetOpen(false)}
                  type="button"
                >
                  <X size={16} />
                  {lang === "th" ? "ปิด" : "Close"}
                </button>
              </div>
            </div>
            <div className="print-sheet-wrapper">
              <MedicationSheet plan={currentPlan} lang={lang} printLayout={printLayout} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
