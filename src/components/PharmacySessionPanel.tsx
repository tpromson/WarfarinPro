import { useState } from "react";
import type { CorrectionReason } from "../coordination/types";

const reasons: CorrectionReason[] = [
  "pill_burden",
  "stock_issue",
  "safety_concern",
  "unclear_instruction",
  "other",
];

export default function PharmacySessionPanel({
  lang,
  loading,
  error,
  onFindSession,
  onRequestCorrection,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  onFindSession: (hn: string) => void;
  onRequestCorrection: (reason: CorrectionReason, note: string) => void;
}) {
  const [hn, setHn] = useState("");
  const [reason, setReason] = useState<CorrectionReason>("pill_burden");
  const [note, setNote] = useState("");

  return (
    <section className="space-y-4 border border-clinic-line bg-white rounded-2xl p-4 shadow-soft">
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onFindSession(hn.trim());
        }}
      >
        <label className="field flex-1">
          HN
          <input value={hn} onChange={(event) => setHn(event.target.value)} required />
        </label>
        <button className="icon-button self-end" disabled={loading} type="submit">
          {lang === "th" ? "ค้นหา session" : "Find session"}
        </button>
      </form>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onRequestCorrection(reason, note.trim());
        }}
      >
        <label className="field">
          {lang === "th" ? "เหตุผล" : "Reason"}
          <select value={reason} onChange={(event) => setReason(event.target.value as CorrectionReason)}>
            {reasons.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {lang === "th" ? "หมายเหตุสั้น ๆ" : "Short note"}
          <textarea maxLength={300} value={note} onChange={(event) => setNote(event.target.value)} required />
        </label>
        <button className="icon-button" disabled={loading || note.trim().length === 0} type="submit">
          {lang === "th" ? "ขอให้แพทย์แก้ไข" : "Request correction"}
        </button>
      </form>
      {error && <p className="text-xs font-bold text-clinic-red">{error}</p>}
    </section>
  );
}
