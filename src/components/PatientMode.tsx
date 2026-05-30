import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Home,
  Printer,
  Save,
  Speaker,
  UserRound,
  ZoomIn,
} from "lucide-react";
import { generateGoogleCalendarUrl, generateIcsFile, parseWCodeToPlan } from "../clinical";
import { t } from "../i18n";
import { speakPlan } from "../tts";
import type { MedicationPlan } from "../types";
import Panel from "./Panel";
import IconButton from "./IconButton";
import MedicationSheet from "./MedicationSheet";
import SavedPlanList from "./SavedPlanList";

export default function PatientMode({
  plan,
  savedPlans,
  onSave,
  onDelete,
  onSelect,
  lang = "th",
  printLayout,
  setPrintLayout,
}: {
  plan: MedicationPlan | null;
  savedPlans: MedicationPlan[];
  onSave: (plan: MedicationPlan) => void;
  onDelete: (id: string) => void;
  onSelect: (plan: MedicationPlan) => void;
  lang?: "th" | "en";
  printLayout: "half-a4" | "label";
  setPrintLayout: (layout: "half-a4" | "label") => void;
}) {
  const [showCalMenu, setShowCalMenu] = useState(false);
  const [speakGender, setSpeakGender] = useState<"female" | "male">("female");
  const [wCodeInput, setWCodeInput] = useState("");
  const [wCodeError, setWCodeError] = useState("");
  const [isLargeFont, setIsLargeFont] = useState(false);
  const [showVoicePrompt, setShowVoicePrompt] = useState(true);

  useEffect(() => {
    if (!showCalMenu) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".dropdown-container")) {
        setShowCalMenu(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showCalMenu]);

  const handleDownloadIcs = (plan: MedicationPlan) => {
    const icsContent = generateIcsFile(plan);
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `warfarin-dosing-schedule-${plan.wCode}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!plan) {
    const handleWCodeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const parsed = parseWCodeToPlan(wCodeInput);
      if (parsed) {
        setWCodeError("");
        onSelect(parsed);
      } else {
        setWCodeError(t[lang].wcodeError);
      }
    };

    return (
      <div className="mx-auto max-w-xl px-4 py-8 space-y-6">
        <Panel title={t[lang].enterWCode} icon={<UserRound size={18} />}>
          <form onSubmit={handleWCodeSubmit} className="space-y-4">
            <label className="field">
              {t[lang].enterWCode}
              <input
                type="text"
                placeholder={t[lang].wcodePlaceholder}
                value={wCodeInput}
                onChange={(e) => {
                  setWCodeInput(e.target.value);
                  if (wCodeError) setWCodeError("");
                }}
                onFocus={(e) => e.target.select()}
                className="uppercase tracking-wide"
                style={{ textTransform: "uppercase" }}
              />
            </label>
            {wCodeError && <p className="text-xs text-clinic-red font-bold">{wCodeError}</p>}
            <button type="submit" className="icon-button w-full" style={{ justifyContent: "center" }}>
              {t[lang].showSchedule}
            </button>
          </form>
        </Panel>

        <Panel title={t[lang].savedPlans} icon={<Home size={18} />}>
          {savedPlans.length === 0 ? (
            <p className="text-slate-500 text-sm">{t[lang].noSavedPlans}</p>
          ) : (
            <SavedPlanList plans={savedPlans} onSelect={onSelect} onDelete={onDelete} />
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      {showVoicePrompt && (
        <div className="mb-4 rounded-xl p-4 flex items-center justify-between gap-4 voice-prompt-banner print:hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-clinic-cyan text-clinic-blue text-xl flex-shrink-0">
              🔊
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-clinic-blue">
                {lang === "th" ? "บริการแนะนำด้วยเสียงนำทาง" : "Voice Dosing Guidance"}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                {lang === "th"
                  ? "กดปุ่มเพื่อฟังเสียงอธิบายวิธีกินยาภาษาไทยสำหรับตารางนี้"
                  : "Click the button to listen to voice guidance for this schedule"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              speakPlan(plan, speakGender);
              setShowVoicePrompt(false);
            }}
            className="flex-shrink-0 px-4 py-2 bg-clinic-blue text-white rounded-lg font-bold text-sm shadow hover:bg-clinic-blue/90 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>{lang === "th" ? "กดฟังเสียงแนะนำยา" : "Listen Dosing"}</span>
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{t[lang].patientViewer}</h2>
            <button
              onClick={() => onSelect(null as any)}
              className="text-xs text-slate-500 hover:text-clinic-blue font-semibold border border-clinic-line rounded-lg px-2.5 py-1 hover:border-clinic-blue transition-all bg-white hover:bg-clinic-cyan/10"
            >
              {t[lang].changeWCode}
            </button>
          </div>
          <p className="text-sm text-slate-600">{t[lang].noPatientId}</p>
        </div>
      </div>

      {/* Patient Toolkit Panel */}
      <div className="mb-6 bg-white border border-clinic-line rounded-2xl p-4 shadow-soft flex flex-wrap gap-6 items-center justify-between print:hidden">
        <div className="space-y-1">
          <h3 className="text-sm font-extrabold text-clinic-ink">
            {lang === "th" ? "🛠️ เครื่องมือช่วยผู้ป่วย (Patient Toolkit)" : "🛠️ Patient Toolkit"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
            {lang === "th"
              ? "ใช้ระบบเสียงแนะนำการทานยา, ซูมขนาดตัวอักษร, บันทึกลงปฏิทินมือถือ หรือสั่งพิมพ์ตารางยา"
              : "Use audio guidance, zoom text size, add calendar reminders, or print schedule"}
          </p>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          {/* Group 1: Audio Dosing Guidance */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shadow-sm">
            <span className="text-[9px] uppercase font-black text-slate-400 px-1.5 border-r border-slate-200 mr-0.5 tracking-wider">Audio</span>
            <div className="segmented !shadow-none !border-0 !p-0 !bg-transparent mr-1" role="radiogroup" aria-label={lang === "th" ? "เลือกเสียงนำทาง" : "Voice guidance gender"}>
              <button role="radio" aria-checked={speakGender === "female"} className={`!min-h-[32px] !py-0 !px-2.5 !text-xs ${speakGender === "female" ? "active" : ""}`} onClick={() => setSpeakGender("female")}>
                👩‍⚕️ {lang === "th" ? "หญิง" : "Female"}
              </button>
              <button role="radio" aria-checked={speakGender === "male"} className={`!min-h-[32px] !py-0 !px-2.5 !text-xs ${speakGender === "male" ? "active" : ""}`} onClick={() => setSpeakGender("male")}>
                👨‍⚕️ {lang === "th" ? "ชาย" : "Male"}
              </button>
            </div>
            <IconButton
              className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
              icon={<Speaker size={14} />}
              onClick={() => speakPlan(plan, speakGender)}
              label={t[lang].listenThai}
            />
          </div>

          {/* Group 2: Dosing Tools & Reminders */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shadow-sm">
            <span className="text-[9px] uppercase font-black text-slate-400 px-1.5 border-r border-slate-200 mr-0.5 tracking-wider">Tools</span>
            <IconButton
              className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
              icon={<ZoomIn size={14} />}
              onClick={() => setIsLargeFont(!isLargeFont)}
              label={isLargeFont ? t[lang].zoomNormal : t[lang].zoomText}
            />

            <div className="relative dropdown-container">
              <IconButton
                className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
                icon={<CalendarDays size={14} />}
                onClick={() => setShowCalMenu(!showCalMenu)}
                label={t[lang].addToCal}
                aria-haspopup={true}
                aria-expanded={showCalMenu}
              />
              {showCalMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 z-40 dropdown-menu">
                  <div className="py-1" role="menu" aria-orientation="vertical">
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left font-semibold"
                      onClick={() => {
                        setShowCalMenu(false);
                        handleDownloadIcs(plan);
                      }}
                    >
                      <CalendarDays size={15} className="text-clinic-blue" />
                      <span>{t[lang].downloadIcs}</span>
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left font-semibold"
                      onClick={() => {
                        setShowCalMenu(false);
                        window.open(generateGoogleCalendarUrl(plan), "_blank");
                      }}
                    >
                      <CalendarDays size={15} className="text-orange-500" />
                      <span>{t[lang].addToGoogle}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Group 3: File Management */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shadow-sm">
            <span className="text-[9px] uppercase font-black text-slate-400 px-1.5 border-r border-slate-200 mr-0.5 tracking-wider">File</span>
            <span className="select-wrap mr-1 !h-[32px] !min-h-[32px] flex items-center">
              <select
                value={printLayout}
                onChange={(e) => setPrintLayout(e.target.value as "half-a4" | "label")}
                className="!h-[32px] !min-h-[32px] !py-0 !pl-2.5 !pr-7 !text-[11px] !font-bold !bg-white !border-slate-200 hover:!border-slate-300 !rounded-lg"
              >
                <option value="half-a4">{t[lang].printHalfA4}</option>
                <option value="label">{t[lang].printLabel}</option>
              </select>
              <ChevronDown size={12} className="!right-2" />
            </span>
            <IconButton
              className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
              icon={<Save size={14} />}
              onClick={() => onSave(plan)}
              label={t[lang].saveOffline}
            />
            <IconButton
              className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
              label={t[lang].print}
            />
          </div>
        </div>
      </div>

      <div className={isLargeFont ? "elderly-mode" : ""}>
        <MedicationSheet plan={plan} lang={lang} printLayout={printLayout} />
      </div>

      {savedPlans.length ? (
        <div className="mt-5 print:hidden">
          <Panel title={t[lang].savedPlans} icon={<Home size={18} />}>
            <SavedPlanList plans={savedPlans} onSelect={onSelect} onDelete={onDelete} />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
