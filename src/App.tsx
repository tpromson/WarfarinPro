import { useEffect, useState } from "react";
import { HeartPulse, Info, Lock, ShieldAlert, UserRound, X } from "lucide-react";
import { parsePatientHash } from "./clinical";
import { deleteSavedPlan, loadSavedPlans, savePlan } from "./storage";
import { t } from "./i18n";
import type { MedicationPlan } from "./types";
import DoctorMode from "./components/DoctorMode";
import PatientMode from "./components/PatientMode";

const doctorPasscode = "10949";

export default function App() {
  const [active, setActive] = useState<"doctor" | "patient">("patient");
  const [openedPlan, setOpenedPlan] = useState<MedicationPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<MedicationPlan[]>([]);
  const [lang, setLang] = useState<"th" | "en">("th");
  const [printLayout, setPrintLayout] = useState<"half-a4" | "label">("half-a4");
  const [doctorUnlocked, setDoctorUnlocked] = useState(false);
  const [showPassPrompt, setShowPassPrompt] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

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
    setActive("patient");
  };

  const handleDoctorClick = () => {
    if (doctorUnlocked) {
      setActive("doctor");
    } else {
      setPassInput("");
      setPassError(false);
      setShowPassPrompt(true);
    }
  };

  const handlePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === doctorPasscode) {
      setDoctorUnlocked(true);
      setShowPassPrompt(false);
      setPassInput("");
      setPassError(false);
      setActive("doctor");
    } else {
      setPassError(true);
      setPassInput("");
    }
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
              <button role="tab" aria-selected={active === "doctor"} className={active === "doctor" ? "active" : ""} onClick={handleDoctorClick}>
                <ShieldAlert size={16} /> {lang === "th" ? "แพทย์" : "Doctor"}
              </button>
              <button role="tab" aria-selected={active === "patient"} className={active === "patient" ? "active" : ""} onClick={() => setActive("patient")}>
                <UserRound size={16} /> {lang === "th" ? "ผู้ป่วย" : "Patient"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {showPassPrompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden"
          onClick={() => setShowPassPrompt(false)}
        >
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-soft border border-clinic-line overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-clinic-blue text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock size={18} />
                <h2 className="text-base font-bold">
                  {lang === "th" ? "ยืนยันตัวตนแพทย์" : "Clinician Access"}
                </h2>
              </div>
              <button
                onClick={() => { setShowPassPrompt(false); setPassError(false); }}
                className="text-white/80 hover:text-white text-xl font-bold font-mono focus:outline-none p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handlePassSubmit} className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                {lang === "th"
                  ? "กรุณากรอกรหัสผ่านเพื่อเข้าสู่ระบบแพทย์"
                  : "Please enter the passcode to access the clinician system."}
              </p>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={passInput}
                onChange={(e) => { setPassInput(e.target.value); if (passError) setPassError(false); }}
                placeholder="•••••"
                className={`w-full min-h-[44px] appearance-none border rounded-lg bg-white text-clinic-ink p-3 font-bold text-lg text-center tracking-widest transition-colors focus:outline-none ${
                  passError
                    ? "border-clinic-red focus:border-clinic-red focus:ring-3 focus:ring-clinic-red/15"
                    : "border-slate-300 focus:border-clinic-blue focus:ring-3 focus:ring-clinic-blue/15"
                }`}
              />
              {passError && (
                <p className="text-xs text-clinic-red font-bold text-center">
                  {lang === "th" ? "รหัสผ่านไม่ถูกต้อง" : "Incorrect passcode"}
                </p>
              )}
              <button
                type="submit"
                className="w-full py-2.5 bg-clinic-blue text-white font-bold text-sm rounded-lg hover:bg-clinic-blue/90 transition-colors focus:outline-none"
              >
                {lang === "th" ? "เข้าสู่ระบบ" : "Sign In"}
              </button>
            </form>
          </div>
        </div>
      )}

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
