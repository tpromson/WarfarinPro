import { useState } from "react";

export default function DoctorSessionPanel({
  lang,
  loading,
  error,
  onOpenSession,
}: {
  lang: "th" | "en";
  loading: boolean;
  error: string;
  onOpenSession: (hn: string) => void;
}) {
  const [hn, setHn] = useState("");

  return (
    <section className="border border-clinic-line bg-white rounded-2xl p-4 shadow-soft">
      <form
        className="flex flex-col sm:flex-row gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onOpenSession(hn.trim());
        }}
      >
        <label className="field flex-1">
          HN
          <input value={hn} onChange={(event) => setHn(event.target.value)} required />
        </label>
        <button className="icon-button self-end" disabled={loading} type="submit">
          {lang === "th" ? "เปิดหรือสร้าง session" : "Open or create session"}
        </button>
      </form>
      {error && <p className="mt-2 text-xs font-bold text-clinic-red">{error}</p>}
    </section>
  );
}
