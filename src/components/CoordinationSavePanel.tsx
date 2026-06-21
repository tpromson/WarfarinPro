import { useState } from "react";
import { UsersRound } from "lucide-react";
import Panel from "./Panel";

export default function CoordinationSavePanel({
  lang,
  loading,
  error,
  status,
  onSave,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  status: string;
  onSave: (hn: string) => void;
}) {
  const [hn, setHn] = useState("");

  return (
    <Panel
      title={lang === "th" ? "Session แพทย์-เภสัช" : "Doctor-Pharmacy Session"}
      icon={<UsersRound size={18} />}
    >
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(hn.trim());
        }}
      >
        <label className="field flex-1">
          HN
          <input
            id="coordination-hn-input"
            value={hn}
            onChange={(event) => setHn(event.target.value)}
            required
          />
        </label>
        <button className="icon-button self-end" disabled={loading} type="submit">
          {loading
            ? lang === "th"
              ? "กำลังบันทึก..."
              : "Saving..."
            : lang === "th"
              ? "บันทึกเข้า session แพทย์-เภสัช"
              : "Save to coordination session"}
        </button>
      </form>
      {status && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
          {status}
        </p>
      )}
      {error && <p className="mt-3 text-xs font-bold text-clinic-red">{error}</p>}
      <p className="mt-2 text-[11px] text-slate-500">
        {lang === "th"
          ? "ต้องเข้าสู่ระบบเจ้าหน้าที่ในแท็บประสานงานก่อน HN จะถูก hash ฝั่ง server และไม่ถูกเก็บตรง ๆ"
          : "Sign in on the staff coordination tab first. HN is hashed server-side and is not stored directly."}
      </p>
    </Panel>
  );
}
