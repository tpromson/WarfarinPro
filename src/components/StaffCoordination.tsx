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
  const heading =
    profile.role === "pharmacist"
      ? lang === "th"
        ? "ค้นหา session วันนี้"
        : "Find Today's Session"
      : lang === "th"
        ? "เปิดหรือสร้าง session วันนี้"
        : "Open Or Create Today's Session";

  const handleOpenSession = (_hn: string) => {
    // Wired to the Supabase coordination API in the integration task.
  };

  const handleCorrection = (_reason: CorrectionReason, _note: string) => {
    // Wired to the Supabase coordination API in the integration task.
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
        {profile.role === "pharmacist" ? (
          <PharmacySessionPanel
            lang={lang}
            loading={false}
            error=""
            onFindSession={handleOpenSession}
            onRequestCorrection={handleCorrection}
          />
        ) : (
          <DoctorSessionPanel lang={lang} loading={false} error="" onOpenSession={handleOpenSession} />
        )}
      </div>
    </div>
  );
}
