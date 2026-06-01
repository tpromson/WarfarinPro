import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  FileDown,
  Home,
  Printer,
  Save,
  UserRound,
  ZoomIn,
  Play,
  Pause,
  Square,
  WifiOff,
} from "lucide-react";
import QRCode from "qrcode";
import {
  buildPatientUrl,
  generateGoogleCalendarUrl,
  generateIcsFile,
  parseWCodeToPlan,
} from "../clinical";
import { t } from "../i18n";
import { generateMedicationSheetPdf } from "../pdf";
import { speechController, SpeechStatus } from "../tts";
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
  onSelect: (plan: MedicationPlan | null) => void;
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
  const [audioStatus, setAudioStatus] = useState<SpeechStatus>("idle");
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [qr, setQr] = useState("");

  const url = useMemo(() => (plan ? buildPatientUrl(plan) : ""), [plan]);

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { errorCorrectionLevel: "Q", margin: 3, width: 300 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

  useEffect(() => {
    return speechController.subscribe(setAudioStatus);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const [calStartDate, setCalStartDate] = useState(() => plan?.issuedDate || "");
  const [calEndDate, setCalEndDate] = useState(() => {
    if (!plan?.issuedDate) return "";
    const [y, m, d] = plan.issuedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 28); // default 4 weeks
    const cy = date.getFullYear();
    const cm = String(date.getMonth() + 1).padStart(2, "0");
    const cd = String(date.getDate()).padStart(2, "0");
    return `${cy}-${cm}-${cd}`;
  });

  const [prevPlanId, setPrevPlanId] = useState(plan?.id);
  if (plan && plan.id !== prevPlanId) {
    setPrevPlanId(plan.id);
    setCalStartDate(plan.issuedDate);
    const [y, m, d] = plan.issuedDate.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 28);
    const cy = date.getFullYear();
    const cm = String(date.getMonth() + 1).padStart(2, "0");
    const cd = String(date.getDate()).padStart(2, "0");
    setCalEndDate(`${cy}-${cm}-${cd}`);
  }

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

  const handleDownloadIcs = (plan: MedicationPlan, startDate: string, endDate: string) => {
    const icsContent = generateIcsFile(plan, startDate, endDate, lang);
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

  const handleDownloadPdf = async (filename: string) => {
    if (!plan || !qr) return;
    setPdfLoading(true);
    try {
      await generateMedicationSheetPdf(plan, qr, lang, filename);
    } catch (err) {
      console.error("PDF error:", err);
    } finally {
      setPdfLoading(false);
    }
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
            <button
              type="submit"
              className="icon-button w-full"
              style={{ justifyContent: "center" }}
            >
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
    <div className="mx-auto max-w-6xl px-3 sm:px-4 py-5">
      {isOffline && (
        <div className="mb-4 rounded-xl p-3 bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-between gap-3 text-xs font-bold print:hidden">
          <div className="flex items-center gap-2">
            <WifiOff size={16} className="text-slate-500 shrink-0" />
            <span>
              {lang === "th"
                ? "คุณกำลังใช้งานแบบออฟไลน์ (ตารางกินยายังคงทำงานได้ปกติโดยดึงข้อมูลจากหน่วยความจำ)"
                : "You are offline (medication schedule is active offline from cache)"}
            </span>
          </div>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full uppercase shrink-0">
            PWA Cache
          </span>
        </div>
      )}

      {showVoicePrompt && (
        <div className="mb-4 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 voice-prompt-banner print:hidden">
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
              speechController.play(plan, speakGender, lang);
              setShowVoicePrompt(false);
            }}
            className="flex-shrink-0 px-4 py-2 bg-clinic-blue text-white rounded-lg font-bold text-sm shadow hover:bg-clinic-blue/90 active:scale-95 transition-all flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            <span>{lang === "th" ? "กดฟังเสียงแนะนำยา" : "Listen Dosing"}</span>
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl sm:text-2xl font-bold">{t[lang].patientViewer}</h2>
            <button
              onClick={() => onSelect(null)}
              className="text-xs text-slate-500 hover:text-clinic-blue font-semibold border border-clinic-line rounded-lg px-2.5 py-1 hover:border-clinic-blue transition-all bg-white hover:bg-clinic-cyan/10"
            >
              {t[lang].changeWCode}
            </button>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">{t[lang].noPatientId}</p>
        </div>
      </div>

      {/* Patient Toolkit Panel */}
      <div className="mb-6 bg-white border border-clinic-line rounded-2xl p-3 sm:p-4 shadow-soft print:hidden">
        {/* Toolkit header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div>
            <h3 className="text-sm font-extrabold text-clinic-ink">
              {lang === "th" ? "🛠️ เครื่องมือช่วยผู้ป่วย" : "🛠️ Patient Toolkit"}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed hidden">
              {lang === "th"
                ? "ใช้ระบบเสียงแนะนำการทานยา, ซูมขนาดตัวอักษร, บันทึกลงปฏิทินมือถือ หรือสั่งพิมพ์ตารางยา"
                : "Use audio guidance, zoom text size, add calendar reminders, or print schedule"}
            </p>
          </div>
        </div>

        {/* Toolkit tools - mobile: stacked, desktop: row */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          {/* Group 1: Audio Dosing Guidance */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shadow-sm justify-center sm:justify-start flex-wrap">
            <span className="text-[9px] uppercase font-black text-slate-400 px-1.5 border-r border-slate-200 sm:mr-0.5 tracking-wider hidden sm:inline">
              Audio
            </span>
            <div
              className="segmented !shadow-none !border-0 !p-0 !bg-transparent"
              role="radiogroup"
              aria-label={lang === "th" ? "เลือกเสียงนำทาง" : "Voice guidance gender"}
            >
              <button
                role="radio"
                aria-checked={speakGender === "female"}
                className={`!min-h-[32px] !py-0 !px-2.5 !text-xs ${speakGender === "female" ? "active" : ""}`}
                onClick={() => setSpeakGender("female")}
              >
                👩‍⚕️ {lang === "th" ? "หญิง" : "Female"}
              </button>
              <button
                role="radio"
                aria-checked={speakGender === "male"}
                className={`!min-h-[32px] !py-0 !px-2.5 !text-xs ${speakGender === "male" ? "active" : ""}`}
                onClick={() => setSpeakGender("male")}
              >
                👨‍⚕️ {lang === "th" ? "ชาย" : "Male"}
              </button>
            </div>
            {audioStatus === "idle" && (
              <IconButton
                className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
                icon={<Play size={14} />}
                onClick={() => speechController.play(plan, speakGender, lang)}
                label={lang === "th" ? "ฟังคำแนะนำยา" : "Listen Dosing"}
              />
            )}
            {audioStatus === "playing" && (
              <>
                <IconButton
                  className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-800"
                  icon={<Pause size={14} />}
                  onClick={() => speechController.pause()}
                  label={lang === "th" ? "หยุดชั่วคราว" : "Pause"}
                />
                <IconButton
                  className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800"
                  icon={<Square size={14} />}
                  onClick={() => speechController.stop()}
                  label={lang === "th" ? "หยุด" : "Stop"}
                />
              </>
            )}
            {audioStatus === "paused" && (
              <>
                <IconButton
                  className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-800"
                  icon={<Play size={14} />}
                  onClick={() => speechController.resume()}
                  label={lang === "th" ? "ฟังต่อ" : "Resume"}
                />
                <IconButton
                  className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-800"
                  icon={<Square size={14} />}
                  onClick={() => speechController.stop()}
                  label={lang === "th" ? "หยุด" : "Stop"}
                />
              </>
            )}
          </div>

          {/* Group 2: Dosing Tools & Reminders */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shadow-sm justify-center sm:justify-start flex-wrap">
            <span className="text-[9px] uppercase font-black text-slate-400 px-1.5 border-r border-slate-200 sm:mr-0.5 tracking-wider hidden sm:inline">
              Tools
            </span>
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
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl ring-1 ring-black/5 p-4 z-40 dropdown-menu space-y-3">
                  <h4 className="text-xs font-black text-clinic-ink uppercase tracking-wider border-b pb-1.5 border-slate-100">
                    {lang === "th" ? "ตั้งค่าปฏิทินกินยา" : "Calendar Reminders"}
                  </h4>

                  <label className="flex flex-col gap-1 text-left">
                    <span className="text-[11px] font-bold text-slate-500">
                      {lang === "th" ? "วันเริ่มต้นทานยา" : "Start Date"}
                    </span>
                    <input
                      type="date"
                      value={calStartDate}
                      onChange={(e) => setCalStartDate(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded px-2 py-1 bg-slate-50"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-left">
                    <span className="text-[11px] font-bold text-slate-500">
                      {lang === "th" ? "วันนัดตรวจครั้งถัดไป" : "Next Appointment"}
                    </span>
                    <input
                      type="date"
                      value={calEndDate}
                      onChange={(e) => setCalEndDate(e.target.value)}
                      className="text-xs font-bold border border-slate-200 rounded px-2 py-1 bg-slate-50"
                    />
                  </label>

                  <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left font-bold rounded-lg border border-slate-100"
                      onClick={() => {
                        setShowCalMenu(false);
                        handleDownloadIcs(plan, calStartDate, calEndDate);
                      }}
                    >
                      <CalendarDays size={14} className="text-clinic-blue" />
                      <span>{t[lang].downloadIcs}</span>
                    </button>
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 text-left font-bold rounded-lg border border-slate-100"
                      onClick={() => {
                        setShowCalMenu(false);
                        window.open(
                          generateGoogleCalendarUrl(plan, calStartDate, calEndDate, lang),
                          "_blank",
                        );
                      }}
                    >
                      <CalendarDays size={14} className="text-orange-500" />
                      <span>{t[lang].addToGoogle}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Group 3: File Management */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-xl p-1.5 shadow-sm justify-center sm:justify-start flex-wrap">
            <span className="text-[9px] uppercase font-black text-slate-400 px-1.5 border-r border-slate-200 sm:mr-0.5 tracking-wider hidden sm:inline">
              File
            </span>
            <span className="select-wrap !h-[32px] !min-h-[32px] flex items-center">
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
              label={lang === "th" ? "บันทึก" : "Save"}
            />
            <IconButton
              className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
              icon={<FileDown size={14} />}
              onClick={() => handleDownloadPdf(`warfarin-${plan.wCode}.pdf`)}
              label="PDF"
            />
            <IconButton
              className="!min-h-[32px] !h-[32px] !text-xs !py-1 !px-2.5"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
              label={lang === "th" ? "พิมพ์" : "Print"}
            />
          </div>
        </div>
      </div>

      {plan.source === "wcode" && (
        <div className="mb-4 rounded-xl p-4 flex items-start gap-3 bg-orange-50 border border-orange-200 print:hidden">
          <AlertCircle size={20} className="text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-orange-800">
              {lang === "th" ? "ข้อมูลจาก W-code" : "W-code Schedule"}
            </h3>
            <p className="text-xs text-orange-700 mt-0.5">{t[lang].wcodeWarning}</p>
          </div>
        </div>
      )}

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
