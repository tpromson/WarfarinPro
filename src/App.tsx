import { useEffect, useState } from "react";
import { HeartPulse, Info, ShieldAlert, UserRound } from "lucide-react";
import { parsePatientHash } from "./clinical";
import { deleteSavedPlan, loadSavedPlans, savePlan } from "./storage";
import { t } from "./i18n";
import type { MedicationPlan } from "./types";
import DoctorMode from "./components/DoctorMode";
import PatientMode from "./components/PatientMode";

export default function App() {
  const [active, setActive] = useState<"doctor" | "patient">("doctor");
  const [openedPlan, setOpenedPlan] = useState<MedicationPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<MedicationPlan[]>([]);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [printLayout, setPrintLayout] = useState<"half-a4" | "label">("half-a4");

  useEffect(() => {
    setSavedPlans(loadSavedPlans());
    const fromHash = parsePatientHash();
    if (fromHash) {
      setOpenedPlan(fromHash);
      setActive("patient");
    }
  }, []);

  const handleHomeClick = () => {
    window.location.hash = "";
    setOpenedPlan(null);
    setActive("doctor");
  };

  return (
    <main className="flex flex-col min-h-screen bg-clinic-paper text-clinic-ink">
      <header className="sticky top-0 z-30 border-b border-clinic-line/60 bg-white/85 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(23,50,77,0.03)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-clinic-blue hover:opacity-80 transition-opacity"
            title={lang === "th" ? "กลับไปหน้าหลัก" : "Return to Home"}
            aria-label={lang === "th" ? "กลับไปหน้าหลัก" : "Return to Home"}
          >
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-clinic-blue text-white">
              <HeartPulse size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight text-clinic-ink">WarfarinPro</h1>
              <p className="text-xs text-slate-600">
                {lang === "th" ? "ระบบแนะนำการรับประทานยาวาร์ฟาริน" : "Physician-directed warfarin support"}
              </p>
            </div>
          </button>
          <div className="flex items-center gap-3 print:hidden">
            <div className="flex items-center gap-0.5 border border-clinic-line/60 rounded-lg p-0.5 bg-slate-50 shadow-sm text-[10px]" role="radiogroup" aria-label={lang === "th" ? "เลือกภาษา" : "Select language"}>
              <button
                role="radio"
                aria-checked={lang === "th"}
                className={`px-2.5 py-0.5 rounded font-black transition-all focus-visible:outline-2 focus-visible:outline-clinic-blue ${
                  lang === "th"
                    ? "bg-clinic-blue text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setLang("th")}
              >
                TH
              </button>
              <button
                role="radio"
                aria-checked={lang === "en"}
                className={`px-2.5 py-0.5 rounded font-black transition-all focus-visible:outline-2 focus-visible:outline-clinic-blue ${
                  lang === "en"
                    ? "bg-clinic-blue text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
                onClick={() => setLang("en")}
              >
                EN
              </button>
            </div>

            <div className="segmented" role="tablist" aria-label={lang === "th" ? "เลือกโหมด" : "Select mode"}>
              <button role="tab" aria-selected={active === "doctor"} className={active === "doctor" ? "active" : ""} onClick={() => setActive("doctor")}>
                <ShieldAlert size={16} /> {lang === "th" ? "แพทย์" : "Doctor"}
              </button>
              <button role="tab" aria-selected={active === "patient"} className={active === "patient" ? "active" : ""} onClick={() => setActive("patient")}>
                <UserRound size={16} /> {lang === "th" ? "ผู้ป่วย" : "Patient"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-grow flex flex-col">
        {active === "doctor" ? (
          <DoctorMode
            onOpenPatient={(plan) => {
              setOpenedPlan(plan);
              setActive("patient");
            }}
            lang={lang}
            printLayout={printLayout}
            setPrintLayout={setPrintLayout}
          />
        ) : (
          <PatientMode
            plan={openedPlan}
            savedPlans={savedPlans}
            onSave={(plan) => setSavedPlans(savePlan(plan))}
            onDelete={(id) => setSavedPlans(deleteSavedPlan(id))}
            onSelect={setOpenedPlan}
            lang={lang}
            printLayout={printLayout}
            setPrintLayout={setPrintLayout}
          />
        )}
      </div>

      <footer className="mt-auto border-t border-clinic-line/30 bg-white/70 py-4 text-xs text-slate-500 print:hidden">
        <div className="mx-auto flex max-w-7xl flex-col sm:flex-row items-center justify-between gap-2 px-4">
          <div>
            &copy; {new Date().getFullYear()} <span className="font-semibold text-slate-700">tpromson@gmail.com</span>. {lang === "th" ? "สงวนลิขสิทธิ์ทั้งหมด" : "All rights reserved."}
          </div>
          <a
            href="mailto:tpromson@gmail.com?subject=WarfarinPro%20-%20Report%20an%20Issue"
            className="flex items-center gap-1.5 text-clinic-blue hover:text-clinic-blue/80 transition-colors font-semibold"
          >
            <Info size={14} />
            {lang === "th" ? "แจ้งปัญหาการใช้งาน" : "Report Issues"}
          </a>
        </div>
      </footer>
    </main>
  );
}
