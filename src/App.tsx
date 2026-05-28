import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  Download,
  HeartPulse,
  Home,
  MessageCircle,
  Printer,
  QrCode,
  Save,
  ShieldAlert,
  Speaker,
  Trash2,
  UserRound,
  ZoomIn,
} from "lucide-react";
import {
  buildMaintenanceSchedule,
  buildPatientUrl,
  comboForDose,
  contextLabels,
  dayLabels,
  days,
  generateGoogleCalendarUrl,
  generateIcsFile,
  getSuggestion,
  interactionLabels,
  makePlan,
  parsePatientHash,
  parseWCodeToPlan,
  pillCombos,
  planSpeech,
  roundToHalf,
} from "./clinical";
import { deleteSavedPlan, loadSavedPlans, savePlan } from "./storage";
import { ContextFlag, DayDose, DayKey, InteractionFlag, MedicationPlan, TargetRange } from "./types";

const interactionKeys = Object.keys(interactionLabels) as InteractionFlag[];
const contextKeys: ContextFlag[] = ["mechanicalValve", "pregnancy", "liverDisease"];
const doseOptions = pillCombos.map((combo) => combo.dose).filter((dose) => dose <= 12);

const t = {
  th: {
    doctor: "สำหรับแพทย์",
    patient: "สำหรับผู้ป่วย",
    patientViewer: "ตารางแนะนำการรับประทานยา",
    noPatientId: "ไม่มีการบันทึกข้อมูลส่วนบุคคลในระบบนี้ เพื่อความเป็นส่วนตัวสูงสุด",
    changeWCode: "ป้อนรหัส W-code ใหม่",
    listenThai: "ฟังเสียงนำทาง",
    addToCal: "เพิ่มลงปฏิทิน",
    downloadIcs: "ดาวน์โหลดปฏิทิน (.ics)",
    addToGoogle: "เพิ่มลง Google Calendar",
    saveOffline: "บันทึกในเครื่อง",
    print: "พิมพ์แผ่นแนะนำยา",
    savedPlans: "ประวัติแผนยาที่เลือก",
    noSavedPlans: "ยังไม่มีแผนยาที่บันทึกไว้ในเครื่องนี้",
    enterWCode: "ระบุรหัสตารางยา (W-code)",
    wcodePlaceholder: "เช่น W3500 หรือ W0752",
    wcodeError: "รหัสไม่ถูกต้อง (รูปแบบที่ถูกต้อง เช่น W3500, W0752)",
    showSchedule: "แสดงตารางรับประทานยา",
    patientName: "ชื่อผู้ป่วย / Patient Name",
    hn: "หมายเลขประจำตัวผู้ป่วย (HN)",
    appointment: "วันนัดตรวจครั้งถัดไป / Next Appointment",
    physicianSignature: "ลายมือชื่อแพทย์ / เภสัชกร",
    weeklyDose: "ขนาดยารวมต่อสัปดาห์",
    targetInr: "เป้าหมายค่า INR",
    issued: "วันที่สั่งยา",
    firstWeekTitle: "สัปดาห์แรก (หลังวันตรวจนัด)",
    firstWeekSubtitle: "ตารางกินยาช่วงเริ่มต้น",
    maintenanceWeekTitle: "สัปดาห์ถัดไป (ทานต่อเนื่อง)",
    maintenanceWeekSubtitle: "ทานซ้ำแบบเดิมในทุกสัปดาห์ (จันทร์-อาทิตย์)",
    warningTitle: "ข้อควรระวังสำคัญ! (โปรดอ่านและจำไว้เสมอ)",
    warningText: "หากท่านมีอาการเลือดออกผิดปกติ อุจจาระดำหรือแดง ปัสสาวะเป็นเลือด เวียนศีรษะอย่างรุนแรง หรือหกล้มศีรษะกระแทก ให้รีบเดินทางไปพบแพทย์ที่โรงพยาบาลทันที!",
    zoomText: "ซูมตัวอักษรใหญ่พิเศษ (สำหรับผู้สูงอายุ)",
    zoomNormal: "ย่อขนาดตัวอักษรปกติ",
  },
  en: {
    doctor: "Doctor",
    patient: "Patient",
    patientViewer: "Medication Dosing Plan",
    noPatientId: "No personal identifiers are stored in this plan for privacy.",
    changeWCode: "Change W-code",
    listenThai: "Listen Guidance",
    addToCal: "Add to Calendar",
    downloadIcs: "Download (.ics)",
    addToGoogle: "Google Calendar",
    saveOffline: "Save Offline",
    print: "Print Plan",
    savedPlans: "Saved Dosing Plans",
    noSavedPlans: "No saved plans on this device.",
    enterWCode: "Enter Dosing Plan Code (W-code)",
    wcodePlaceholder: "e.g., W3500 or W0752",
    wcodeError: "Invalid format (Example format: W3500, W0752)",
    showSchedule: "Display Schedule",
    patientName: "Patient Name / ชื่อผู้ป่วย",
    hn: "Hospital Number (HN)",
    appointment: "Next Appointment / วันนัดตรวจครั้งถัดไป",
    physicianSignature: "Physician/Pharmacist Signature",
    weeklyDose: "Weekly Dose",
    targetInr: "Target INR",
    issued: "Issued Date",
    firstWeekTitle: "First Week",
    firstWeekSubtitle: "Initial dosing schedule",
    maintenanceWeekTitle: "Maintenance Week",
    maintenanceWeekSubtitle: "Repeatable weekly schedule (Mon-Sun)",
    warningTitle: "Critical Safety Warnings!",
    warningText: "If you experience any abnormal bleeding, black or red stools, blood in urine, severe dizziness, or hit your head in a fall, seek immediate medical attention at the hospital!",
    zoomText: "Zoom Large Text (For Seniors)",
    zoomNormal: "Use Normal Text Size",
  }
};

const getDayLabel = (day: DayKey, lang: "th" | "en") => {
  if (lang === "en") {
    const en: Record<DayKey, string> = {
      mon: "Monday",
      tue: "Tuesday",
      wed: "Wednesday",
      thu: "Thursday",
      fri: "Friday",
      sat: "Saturday",
      sun: "Sunday",
    };
    return en[day];
  } else {
    const th: Record<DayKey, string> = {
      mon: "วันจันทร์",
      tue: "วันอังคาร",
      wed: "วันพุธ",
      thu: "วันพฤหัสบดี",
      fri: "วันศุกร์",
      sat: "วันเสาร์",
      sun: "วันอาทิตย์",
    };
    return th[day];
  }
};

export default function App() {
  const [active, setActive] = useState<"doctor" | "patient">("doctor");
  const [openedPlan, setOpenedPlan] = useState<MedicationPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<MedicationPlan[]>([]);
  const [lang, setLang] = useState<"th" | "en">("th");

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
    <main className="min-h-screen bg-clinic-paper text-clinic-ink">
      <header className="sticky top-0 z-30 border-b border-clinic-line/60 bg-white/85 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(23,50,77,0.03)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <button
            onClick={handleHomeClick}
            className="flex items-center gap-3 text-left focus:outline-none hover:opacity-80 transition-opacity"
            title={lang === "th" ? "กลับไปหน้าหลัก" : "Return to Home"}
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
            <div className="segmented">
              <button className={lang === "th" ? "active" : ""} onClick={() => setLang("th")}>
                TH
              </button>
              <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
                EN
              </button>
            </div>

            <div className="segmented">
              <button className={active === "doctor" ? "active" : ""} onClick={() => setActive("doctor")}>
                <ShieldAlert size={16} /> {lang === "th" ? "แพทย์" : "Doctor"}
              </button>
              <button className={active === "patient" ? "active" : ""} onClick={() => setActive("patient")}>
                <UserRound size={16} /> {lang === "th" ? "ผู้ป่วย" : "Patient"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {active === "doctor" ? (
        <DoctorMode
          onOpenPatient={(plan) => {
            setOpenedPlan(plan);
            setActive("patient");
          }}
          lang={lang}
        />
      ) : (
        <PatientMode
          plan={openedPlan}
          savedPlans={savedPlans}
          onSave={(plan) => setSavedPlans(savePlan(plan))}
          onDelete={(id) => setSavedPlans(deleteSavedPlan(id))}
          onSelect={setOpenedPlan}
          lang={lang}
        />
      )}
    </main>
  );
}

function DoctorMode({ onOpenPatient, lang }: { onOpenPatient: (plan: MedicationPlan) => void; lang: "th" | "en" }) {
  const [inr, setInr] = useState(2.4);
  const [previousDose, setPreviousDose] = useState(35);
  const [preset, setPreset] = useState<"standard" | "mechanical" | "custom">("standard");
  const [customLower, setCustomLower] = useState(2);
  const [customUpper, setCustomUpper] = useState(3);
  const [clinicDay, setClinicDay] = useState<DayKey>("thu");
  const [majorBleeding, setMajorBleeding] = useState(false);
  const [interactions, setInteractions] = useState<InteractionFlag[]>([]);
  const [contexts, setContexts] = useState<ContextFlag[]>([]);
  const [isSummaryHighlighted, setIsSummaryHighlighted] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  const target: TargetRange = useMemo(() => {
    if (preset === "mechanical") return { preset, lower: 2.5, upper: 3.5 };
    if (preset === "custom") return { preset, lower: customLower, upper: customUpper };
    return { preset, lower: 2, upper: 3 };
  }, [customLower, customUpper, preset]);

  const safety = useMemo(() => ({ majorBleeding, interactions, contexts }), [majorBleeding, interactions, contexts]);
  const suggestion = useMemo(() => getSuggestion(inr, target, safety), [inr, safety, target]);
  const [selectedAdjustment, setSelectedAdjustment] = useState(suggestion.defaultAdjustment);
  const [holdDoses, setHoldDoses] = useState(suggestion.defaultHoldDoses);

  useEffect(() => {
    setSelectedAdjustment(suggestion.defaultAdjustment);
    setHoldDoses(suggestion.defaultHoldDoses);
  }, [suggestion.defaultAdjustment, suggestion.defaultHoldDoses]);

  const calculatedDose = roundToHalf(previousDose * (1 + selectedAdjustment / 100));
  const [maintenance, setMaintenance] = useState<DayDose[]>(() => buildMaintenanceSchedule(calculatedDose));

  useEffect(() => {
    setMaintenance(buildMaintenanceSchedule(calculatedDose));
  }, [calculatedDose]);

  const plan = useMemo(
    () =>
      suggestion.severity === "hard-stop"
        ? null
        : makePlan({
            inr,
            previousWeeklyDose: previousDose,
            target,
            safety,
            clinicDay,
            selectedAdjustment,
            holdDoses,
            maintenanceWeek: maintenance,
          }),
    [clinicDay, holdDoses, inr, maintenance, previousDose, safety, selectedAdjustment, suggestion.severity, target],
  );

  const scheduleDelta = plan ? Math.abs(plan.scheduleWeeklyDose - plan.calculatedWeeklyDose) : 0;
  const canShare = Boolean(plan && scheduleDelta <= 0.5 && plan.wCode !== "W----");

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowSummaryModal(false);
      }
      if (!e.altKey) return;
      const key = e.key.toLowerCase();

      const elementMap: Record<string, string> = {
        i: "inr-input",
        p: "prev-dose-input",
        t: "preset-select",
        v: "clinic-day-select",
        d: "adjustment-select",
        f: "hold-doses-select",
      };

      if (elementMap[key]) {
        e.preventDefault();
        document.getElementById(elementMap[key])?.focus();
      } else if (key === "b") {
        e.preventDefault();
        setMajorBleeding((prev) => !prev);
      } else if (key === "s") {
        e.preventDefault();
        if (canShare) {
          setShowSummaryModal(true);
        }
      } else if (key === "o") {
        e.preventDefault();
        document.getElementById("btn-open-patient")?.click();
      } else if (key === "c") {
        e.preventDefault();
        document.getElementById("btn-copy-link")?.click();
      } else if (key === "h") {
        e.preventDefault();
        window.print();
      }
    };

    window.addEventListener("keydown", handleGlobalShortcuts);
    return () => window.removeEventListener("keydown", handleGlobalShortcuts);
  }, [canShare, showSummaryModal]);

  const handleKeyDown = (e: React.KeyboardEvent, currentId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      
      if (currentId === "hold-doses-select" && canShare) {
        setShowSummaryModal(true);
        return;
      }

      const ids = [
        "inr-input",
        "prev-dose-input",
        "preset-select",
        "clinic-day-select",
        "adjustment-select",
        "hold-doses-select",
        "dose-mon",
        "dose-tue",
        "dose-wed",
        "dose-thu",
        "dose-fri",
        "dose-sat",
        "dose-sun",
      ];
      const index = ids.indexOf(currentId);
      if (index !== -1) {
        const nextIndex = e.shiftKey ? index - 1 : index + 1;
        if (nextIndex >= 0 && nextIndex < ids.length) {
          document.getElementById(ids[nextIndex])?.focus();
        }
      }
    }
  };

  function toggleInteraction(flag: InteractionFlag) {
    setInteractions((current) => (current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]));
  }

  function toggleContext(flag: ContextFlag) {
    setContexts((current) => (current.includes(flag) ? current.filter((item) => item !== flag) : [...current, flag]));
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[360px_1fr]">
      <section className="space-y-4">
        <Panel title="Clinical Inputs" icon={<HeartPulse size={18} />}>
          <NumberField
            id="inr-input"
            shortcut="Alt+I"
            label="Current INR"
            value={inr}
            step={0.1}
            min={0.5}
            max={12}
            onChange={setInr}
            onKeyDown={(e) => handleKeyDown(e, "inr-input")}
          />
          <NumberField
            id="prev-dose-input"
            shortcut="Alt+P"
            label="Previous weekly dose (mg)"
            value={previousDose}
            step={0.5}
            min={0}
            max={99.9}
            onChange={setPreviousDose}
            onKeyDown={(e) => handleKeyDown(e, "prev-dose-input")}
          />
          <label className="field">
            <span className="flex items-center justify-between">
              <span>Target range</span>
              <kbd className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold select-none border border-slate-200">
                Alt+T
              </kbd>
            </span>
            <span className="select-wrap">
              <select
                id="preset-select"
                value={preset}
                onChange={(event) => setPreset(event.target.value as typeof preset)}
                onKeyDown={(e) => handleKeyDown(e, "preset-select")}
              >
                <option value="standard">Standard 2.0-3.0</option>
                <option value="mechanical">Mechanical valve 2.5-3.5</option>
                <option value="custom">Custom range</option>
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
          {preset === "custom" ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Lower" value={customLower} step={0.1} min={1} max={5} onChange={setCustomLower} />
              <NumberField label="Upper" value={customUpper} step={0.1} min={1} max={6} onChange={setCustomUpper} />
            </div>
          ) : null}
          <label className="field">
            <span className="flex items-center justify-between">
              <span>Clinic visit day</span>
              <kbd className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold select-none border border-slate-200">
                Alt+V
              </kbd>
            </span>
            <span className="select-wrap">
              <select
                id="clinic-day-select"
                value={clinicDay}
                onChange={(event) => setClinicDay(event.target.value as DayKey)}
                onKeyDown={(e) => handleKeyDown(e, "clinic-day-select")}
              >
                {days.map((day) => (
                  <option key={day} value={day}>
                    {dayLabels[day]}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} />
            </span>
          </label>
        </Panel>

        <Panel title="Safety Flags" icon={<ShieldAlert size={18} />}>
          <label className="check danger justify-between">
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={majorBleeding} onChange={(event) => setMajorBleeding(event.target.checked)} />
              Major bleeding
            </span>
            <kbd className="text-[9px] font-mono bg-red-100 text-red-700 rounded px-1.5 py-0.5 font-semibold select-none border border-red-200">
              Alt+B
            </kbd>
          </label>
          <div className="check-grid">
            {contextKeys.map((flag) => (
              <label key={flag} className="check">
                <input type="checkbox" checked={contexts.includes(flag)} onChange={() => toggleContext(flag)} />
                {contextLabels[flag]}
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs font-semibold uppercase text-slate-500">Interaction flags</div>
          <div className="check-grid">
            {interactionKeys.map((flag) => (
              <label key={flag} className="check">
                <input type="checkbox" checked={interactions.includes(flag)} onChange={() => toggleInteraction(flag)} />
                {interactionLabels[flag]}
              </label>
            ))}
          </div>
        </Panel>
      </section>

      <section className="space-y-4">
        <StatusBanner suggestion={suggestion} />
        {suggestion.severity === "hard-stop" ? (
          <HardStop reasons={suggestion.hardStopReasons} />
        ) : (
          <>
            <Panel title="Dose Adjustment" icon={<CalendarDays size={18} />}>
              <div className="grid gap-3 md:grid-cols-3">
                <Metric label="Suggested" value={suggestion.label} />
                <Metric label="Calculated weekly dose" value={`${calculatedDose.toFixed(1)} mg`} />
                <Metric label="Target INR" value={`${target.lower.toFixed(1)}-${target.upper.toFixed(1)}`} />
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="field">
                  <span className="flex items-center justify-between">
                    <span>Selected adjustment</span>
                    <kbd className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold select-none border border-slate-200">
                      Alt+D
                    </kbd>
                  </span>
                  <span className="select-wrap">
                    <select
                      id="adjustment-select"
                      value={selectedAdjustment}
                      onChange={(event) => setSelectedAdjustment(Number(event.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, "adjustment-select")}
                    >
                      {suggestion.adjustmentOptions.map((option) => (
                        <option key={option} value={option}>
                          {option > 0 ? "+" : ""}
                          {option}%
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </span>
                </label>
                <label className="field">
                  <span className="flex items-center justify-between">
                    <span>First week hold doses</span>
                    <kbd className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold select-none border border-slate-200">
                      Alt+F
                    </kbd>
                  </span>
                  <span className="select-wrap">
                    <select
                      id="hold-doses-select"
                      value={holdDoses}
                      onChange={(event) => setHoldDoses(Number(event.target.value))}
                      onKeyDown={(e) => handleKeyDown(e, "hold-doses-select")}
                    >
                      {suggestion.holdDoseOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} />
                  </span>
                </label>
              </div>
            </Panel>

            <Panel title="Editable Maintenance Week" icon={<CalendarDays size={18} />}>
              <ScheduleEditor schedule={maintenance} onChange={setMaintenance} onKeyDown={handleKeyDown} />
              {plan ? (
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <Metric label="Schedule total" value={`${plan.scheduleWeeklyDose.toFixed(1)} mg`} tone={scheduleDelta > 0.5 ? "danger" : "normal"} />
                  <Metric label="W-code" value={plan.wCode} />
                  <Metric label="First week hold" value={`${plan.firstWeekHoldDoses} dose${plan.firstWeekHoldDoses === 1 ? "" : "s"}`} />
                  <Metric label="Schedule quality" value={plan.safety.complexSchedule ? "Complex" : "Simple"} tone={plan.safety.complexSchedule ? "caution" : "normal"} />
                </div>
              ) : null}
              {scheduleDelta > 0.5 ? <p className="warning">Schedule total differs from calculated dose by more than 0.5 mg/week. Adjust the schedule or selected dose before sharing.</p> : null}
            </Panel>

            {plan ? (
              <>
                <BookletAndSharePanel
                  plan={plan}
                  canShare={canShare}
                  scheduleDelta={scheduleDelta}
                  onOpenPatient={onOpenPatient}
                  lang={lang}
                  highlighted={isSummaryHighlighted}
                />
                <div className="print-sheet-wrapper">
                  <MedicationSheet plan={plan} lang={lang} />
                </div>
              </>
            ) : null}
          </>
        )}
      </section>

      {showSummaryModal && plan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn print:hidden">
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-soft border border-clinic-line overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-clinic-blue text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={19} />
                <h2 className="text-base font-bold">
                  {lang === "th" ? "สรุปสำหรับลงสมุดยา & แนะนำผู้ป่วย" : "Booklet Transcription & Patient Guide"}
                </h2>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-white/80 hover:text-white text-xl font-bold font-mono focus:outline-none p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto">
              <BookletAndSharePanelContent
                plan={plan}
                onOpenPatient={(p) => {
                  setShowSummaryModal(false);
                  onOpenPatient(p);
                }}
                lang={lang}
              />
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-clinic-line p-3.5 flex justify-end gap-2">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-1.5 bg-slate-300 text-slate-700 hover:bg-slate-400 font-bold text-xs rounded-lg transition-colors focus:outline-none"
              >
                {lang === "th" ? "ปิดหน้าต่าง" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PatientMode({
  plan,
  savedPlans,
  onSave,
  onDelete,
  onSelect,
  lang = "th",
}: {
  plan: MedicationPlan | null;
  savedPlans: MedicationPlan[];
  onSave: (plan: MedicationPlan) => void;
  onDelete: (id: string) => void;
  onSelect: (plan: MedicationPlan) => void;
  lang?: "th" | "en";
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
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
        <div className="flex flex-wrap gap-2">
          <div className="segmented print:hidden">
            <button className={speakGender === "female" ? "active" : ""} onClick={() => setSpeakGender("female")}>
              👩‍⚕️ {lang === "th" ? "หญิง" : "Female"}
            </button>
            <button className={speakGender === "male" ? "active" : ""} onClick={() => setSpeakGender("male")}>
              👨‍⚕️ {lang === "th" ? "ชาย" : "Male"}
            </button>
          </div>
          <IconButton icon={<Speaker size={17} />} onClick={() => speakPlan(plan, speakGender)} label={t[lang].listenThai} />
          
          <IconButton 
            icon={<ZoomIn size={17} />} 
            onClick={() => setIsLargeFont(!isLargeFont)} 
            label={isLargeFont ? t[lang].zoomNormal : t[lang].zoomText} 
          />

          <div className="relative dropdown-container">
            <IconButton icon={<CalendarDays size={17} />} onClick={() => setShowCalMenu(!showCalMenu)} label={t[lang].addToCal} />
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

          <IconButton icon={<Save size={17} />} onClick={() => onSave(plan)} label={t[lang].saveOffline} />
          <IconButton icon={<Printer size={17} />} onClick={() => window.print()} label={t[lang].print} />
        </div>
      </div>
      
      <div className={isLargeFont ? "elderly-mode" : ""}>
        <MedicationSheet plan={plan} lang={lang} />
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

const getPillComboDesc = (combo: DayDose["combo"], hold?: boolean, lang: "th" | "en" = "th") => {
  if (hold || combo.dose === 0) return lang === "th" ? "งดทานยา" : "HOLD";
  const parts: string[] = [];
  if (lang === "th") {
    if (combo.orangeWhole > 0) parts.push(`สีส้ม ${combo.orangeWhole} เม็ด`);
    if (combo.orangeHalf > 0) parts.push(`สีส้ม 1/2 เม็ด`);
    if (combo.blueWhole > 0) parts.push(`สีฟ้า ${combo.blueWhole} เม็ด`);
    if (combo.blueHalf > 0) parts.push(`สีฟ้า 1/2 เม็ด`);
    return parts.length > 0 ? parts.join(" + ") : "งดยา";
  } else {
    if (combo.orangeWhole > 0) parts.push(`Orange ${combo.orangeWhole} tab${combo.orangeWhole > 1 ? "s" : ""}`);
    if (combo.orangeHalf > 0) parts.push(`Orange 1/2 tab`);
    if (combo.blueWhole > 0) parts.push(`Blue ${combo.blueWhole} tab${combo.blueWhole > 1 ? "s" : ""}`);
    if (combo.blueHalf > 0) parts.push(`Blue 1/2 tab`);
    return parts.length > 0 ? parts.join(" + ") : "HOLD";
  }
};

function BookletAndSharePanelContent({
  plan,
  onOpenPatient,
  lang,
}: {
  plan: MedicationPlan;
  onOpenPatient: (plan: MedicationPlan) => void;
  lang: "th" | "en";
}) {
  const [qr, setQr] = useState("");
  const [copiedWCode, setCopiedWCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const url = useMemo(() => buildPatientUrl(plan), [plan]);

  const shortUrl = useMemo(() => {
    try {
      const parsed = new URL(url);
      const hashPart = parsed.hash || "";
      const cleanHash = hashPart.length > 24 ? `${hashPart.substring(0, 21)}...` : hashPart;
      return `${parsed.host}${parsed.pathname}${cleanHash}`;
    } catch {
      return url;
    }
  }, [url]);

  useEffect(() => {
    QRCode.toDataURL(url, { errorCorrectionLevel: "L", margin: 1, width: 240 })
      .then(setQr)
      .catch((err) => console.error("QR Code Error in BookletAndSharePanelContent:", err));
  }, [url]);

  const lineText = `WarfarinPro ${plan.wCode}\nWeekly dose ${plan.scheduleWeeklyDose.toFixed(1)} mg\nOpen plan: ${url}`;

  const handleCopyWCode = () => {
    navigator.clipboard.writeText(plan.wCode);
    setCopiedWCode(true);
    setTimeout(() => setCopiedWCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Left Column: W-Code, QR Code & Links */}
      <div className="space-y-5 border-b border-clinic-line lg:border-b-0 lg:border-r border-dashed border-clinic-line pb-6 lg:pb-0 lg:pr-6 flex flex-col justify-between">
        <div className="space-y-4">
          {/* W-Code Ticket */}
          <div className="bg-clinic-paper border-2 border-dashed border-clinic-blue/40 rounded-xl p-4 text-center space-y-2.5 relative overflow-hidden shadow-sm">
            <div className="text-[11px] uppercase font-bold text-clinic-blue tracking-wider">
              {lang === "th" ? "รหัส W-code สำหรับสมุดยา" : "Warfarin W-Code"}
            </div>
            <div className="text-3xl font-black text-clinic-ink tracking-widest font-mono select-all bg-white py-2 px-4 rounded-lg shadow-sm border border-clinic-line inline-block">
              {plan.wCode}
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              {lang === "th"
                ? "คัดลอกรหัสนี้เขียนลงสมุดคุมยาวาฟาริน หรือให้คนไข้นำไปพิมพ์เปิดตารางยาได้"
                : "Copy this code to write in the patient booklet or use to open their schedule online."}
            </p>

            <button
              onClick={handleCopyWCode}
              className={`w-full py-1.5 font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
                copiedWCode
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300"
              }`}
            >
              {copiedWCode ? <Check size={13} /> : <Copy size={13} />}
              <span>
                {copiedWCode
                  ? lang === "th"
                    ? "คัดลอกสำเร็จ!"
                    : "Copied!"
                  : lang === "th"
                  ? "คัดลอกรหัส W-code"
                  : "Copy W-Code"}
              </span>
            </button>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center p-3 bg-white border border-clinic-line rounded-xl">
            <div className="text-xs font-bold text-clinic-ink mb-1">
              {lang === "th" ? "สแกนเพื่อเปิดตารางยาบนมือถือ" : "Scan to open on Mobile"}
            </div>
            <div className="qr-box max-w-[160px] max-h-[160px] flex items-center justify-center overflow-hidden border border-slate-100 rounded-lg p-1 bg-slate-50">
              {qr ? (
                <img src={qr} alt="Plan QR" className="object-contain" />
              ) : (
                <QrCode size={64} className="text-slate-300" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons for Sharing */}
        <div className="space-y-2">
          <div className="rounded-lg border border-clinic-line bg-slate-50 p-2.5">
            <div className="text-[10px] font-bold uppercase text-slate-500">
              {lang === "th" ? "ลิงก์หน้าผู้ป่วย" : "Patient Link"}
            </div>
            <div className="mt-0.5 text-xs text-clinic-blue font-bold truncate">
              <a href={url} target="_blank" rel="noreferrer" title={url} className="hover:underline">
                {shortUrl}
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <IconButton
              id="btn-copy-link"
              icon={<Copy size={14} />}
              onClick={handleCopyLink}
              label={
                copiedLink
                  ? lang === "th"
                    ? "คัดลอกแล้ว!"
                    : "Copied!"
                  : lang === "th"
                  ? "คัดลอกลิงก์"
                  : "Copy Link"
              }
              shortcut="Alt+C"
            />
            <IconButton
              id="btn-open-patient"
              icon={<UserRound size={14} />}
              onClick={() => onOpenPatient(plan)}
              label={lang === "th" ? "เปิดหน้าผู้ป่วย" : "Patient View"}
              shortcut="Alt+O"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() =>
                window.open(`https://line.me/R/msg/text/?${encodeURIComponent(lineText)}`, "_blank")
              }
              className="w-full min-height-[40px] px-3.5 py-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-lg transition-colors focus:outline-none flex items-center justify-center gap-1.5 shadow-sm"
            >
              <MessageCircle size={14} className="text-[#06C755]" />
              <span>LINE Share</span>
            </button>
            <IconButton
              icon={<Printer size={14} />}
              onClick={() => window.print()}
              label={lang === "th" ? "พิมพ์ใบยา" : "Print Leaflet"}
              shortcut="Alt+H"
            />
          </div>
        </div>
      </div>

      {/* Right Column: Booklet Transcription Details */}
      <div className="space-y-4">
        <div className="bg-slate-50 border border-clinic-line/60 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap justify-between items-center border-b border-clinic-line pb-2.5 gap-2">
            <h3 className="font-extrabold text-sm text-clinic-ink flex items-center gap-2">
              <BookOpen size={16} className="text-clinic-blue" />
              <span>
                {lang === "th" ? "ข้อมูลวิธีกรอกลงสมุดประวัติยาของผู้ป่วย" : "Warfarin Booklet Writing Guide"}
              </span>
            </h3>
            <div className="flex gap-4 text-xs font-bold">
              <span className="text-slate-500">
                {lang === "th" ? "ขนาดยาต่อสัปดาห์: " : "Weekly Dose: "}
                <strong className="text-clinic-ink">{plan.scheduleWeeklyDose.toFixed(1)} mg</strong>
              </span>
              <span className="text-slate-500">
                {lang === "th" ? "เป้าหมาย INR: " : "Target INR: "}
                <strong className="text-clinic-blue">
                  {plan.target.lower.toFixed(1)} - {plan.target.upper.toFixed(1)}
                </strong>
              </span>
            </div>
          </div>

          {/* Step 1: First Week */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-500 block font-bold">
              {lang === "th"
                ? "1. คำแนะนำการกินยาสัปดาห์แรก (สัปดาห์เริ่มต้นยา)"
                : "1. First-Week Instructions (Dosing Start)"}
            </span>
            <div className="bg-orange-50 border border-orange-100 rounded-lg p-3 text-orange-900 font-bold text-xs">
              {plan.firstWeekHoldDoses > 0 ? (
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none">⚠️</span>
                  <span>
                    {lang === "th"
                      ? `งดยา ${plan.firstWeekHoldDoses} วันแรก (เริ่มงดวัน${getDayLabel(
                          plan.clinicDay,
                          "th",
                        )} เป็นต้นไป) จากนั้นทานขนาดปกติตามตารางในวันที่เหลือ`
                      : `Hold drug for the first ${plan.firstWeekHoldDoses} days (starting on ${getDayLabel(
                          plan.clinicDay,
                          "en",
                        )}), then take the regular dose on remaining days.`}
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <span className="text-lg leading-none">✅</span>
                  <span>
                    {lang === "th"
                      ? "ไม่ต้องงดยา เริ่มกินยาตามตารางขนาดปกติ (Maintenance) ได้ทันทีตั้งแต่วันแรก"
                      : "No hold required. Start regular maintenance dose schedule from day one."}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Regular Maintenance Week */}
          <div className="space-y-1.5">
            <span className="text-xs text-slate-500 block font-bold">
              {lang === "th"
                ? "2. ตารางกินยาปกติ (สัปดาห์ถัดไปเป็นต้นไป)"
                : "2. Regular Maintenance Schedule (Following Weeks)"}
            </span>

            <div className="border border-clinic-line/60 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[400px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-clinic-line font-bold">
                    <th className="p-2.5 w-28">{lang === "th" ? "วัน" : "Day"}</th>
                    <th className="p-2.5 text-center w-24">{lang === "th" ? "ขนาดโดส" : "Dose"}</th>
                    <th className="p-2.5 text-center">{lang === "th" ? "ตัวช่วยจำสีเม็ดยา" : "Pill Visual"}</th>
                    <th className="p-2.5 text-right w-44">{lang === "th" ? "วิธีเขียนลงสมุดยา" : "Transcription Text"}</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((dayKey) => {
                    const dayDose = plan.maintenanceWeek.find((d) => d.day === dayKey);
                    if (!dayDose) return null;
                    return (
                      <tr key={dayKey} className="border-b border-clinic-line/30 hover:bg-slate-50/50">
                        <td className="p-2.5 font-bold text-clinic-ink">{getDayLabel(dayKey, lang)}</td>
                        <td className="p-2.5 text-center font-bold text-slate-800">
                          {dayDose.hold ? (
                            <span className="text-clinic-red">{lang === "th" ? "งดทานยา" : "HOLD"}</span>
                          ) : (
                            <span>{dayDose.dose} mg</span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <PillVisual combo={dayDose.combo} hold={dayDose.hold} lang={lang} />
                        </td>
                        <td className="p-2.5 text-right font-medium text-slate-600">
                          {getPillComboDesc(dayDose.combo, dayDose.hold, lang)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Print advice helper */}
          <div className="pt-2 text-right">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-clinic-blue hover:bg-clinic-blue/90 text-white font-extrabold text-xs rounded-xl shadow transition-all focus:outline-none flex items-center justify-center gap-2 inline-flex"
            >
              <Printer size={15} />
              <span>
                {lang === "th" ? "พิมพ์ใบตารางแนะนำยาสำหรับคนไข้" : "Print Patient Guidance Leaflet"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BookletAndSharePanel({
  plan,
  canShare,
  scheduleDelta,
  onOpenPatient,
  lang,
  highlighted,
}: {
  plan: MedicationPlan;
  canShare: boolean;
  scheduleDelta: number;
  onOpenPatient: (plan: MedicationPlan) => void;
  lang: "th" | "en";
  highlighted: boolean;
}) {
  if (!canShare) {
    return (
      <Panel
        id="booklet-summary-panel"
        title={lang === "th" ? "สรุปสำหรับลงสมุดยา & แนะนำผู้ป่วย" : "Booklet Transcription & Patient Guide"}
        icon={<BookOpen size={18} />}
        className={highlighted ? "ring-4 ring-clinic-blue/40" : ""}
      >
        <div className="bg-orange-50 border border-orange-200 text-orange-850 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">
              {lang === "th" ? "ไม่สามารถแสดง W-code และข้อมูลสรุปได้" : "Cannot generate W-Code & Booklet Summary"}
            </h4>
            <p className="text-xs mt-1">
              {lang === "th"
                ? `กรุณาปรับขนาดความแรงยาในตารางกินยาปกติให้ตรงกับขนาดที่คำนวณได้ก่อน (ขนาดยารวมจากตารางยังต่างจากโดสคำนวณอยู่ ${scheduleDelta.toFixed(1)} mg)`
                : `Please adjust the maintenance week dosing schedule to match the calculated weekly dose first (currently differing by ${scheduleDelta.toFixed(1)} mg).`}
            </p>
          </div>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      id="booklet-summary-panel"
      title={lang === "th" ? "สรุปสำหรับลงสมุดยา & แนะนำผู้ป่วย" : "Booklet Transcription & Patient Guide"}
      icon={<BookOpen size={18} />}
      className={highlighted ? "ring-4 ring-clinic-blue/40" : ""}
    >
      <BookletAndSharePanelContent
        plan={plan}
        onOpenPatient={onOpenPatient}
        lang={lang}
      />
    </Panel>
  );
}

function MedicationSheet({ plan, lang = "th" }: { plan: MedicationPlan; lang?: "th" | "en" }) {
  const [qr, setQr] = useState("");
  const url = useMemo(() => buildPatientUrl(plan), [plan]);

  useEffect(() => {
    QRCode.toDataURL(url, { errorCorrectionLevel: "L", margin: 1, width: 140 }).then(setQr).catch((err) => console.error("QR Code Error in MedicationSheet:", err));
  }, [url]);

  return (
    <section className="sheet">
      <div className="sheet-head">
        <div>
          <h2>{lang === "th" ? "ตารางแนะนำการรับประทานยา" : "Warfarin Medication Sheet"}</h2>
          <p>{lang === "th" ? "Warfarin Medication Sheet" : "Medication dosing plan for patients"}</p>
        </div>
        <div className="flex items-center gap-3">
          {qr && (
            <div className="flex flex-col items-center gap-0.5">
              <img src={qr} alt="Plan QR" className="h-14 w-14 border border-clinic-line rounded p-0.5 bg-white" />
              <span className="text-[9px] text-slate-400 font-bold">{lang === "th" ? "สแกนดูตารางยา" : "Scan Schedule"}</span>
            </div>
          )}
          <div className="wcode">{plan.wCode}</div>
        </div>
      </div>

      <div className="blank-grid">
        <span>{t[lang].patientName}: ____________________</span>
        <span>{t[lang].hn}: ____________________</span>
        <span>{t[lang].appointment}: ____________________</span>
        <span>{t[lang].physicianSignature}: ____________________</span>
      </div>

      <div className="sheet-metrics">
        <Metric label={t[lang].weeklyDose} value={`${plan.scheduleWeeklyDose.toFixed(1)} mg`} />
        <Metric label={t[lang].targetInr} value={`${plan.target.lower.toFixed(1)}-${plan.target.upper.toFixed(1)}`} />
        <Metric label={t[lang].issued} value={plan.issuedDate} />
      </div>

      {plan.safety.severity !== "normal" || plan.safety.messages.length ? (
        <div className={`safety ${plan.safety.severity}`}>
          <AlertTriangle size={18} />
          <div>
            <strong>{lang === "th" ? "การประเมินความปลอดภัย" : "Safety review"}</strong>
            {plan.safety.messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ScheduleView
          title={t[lang].firstWeekTitle}
          subtitle={lang === "th" ? `เริ่มวัน${getDayLabel(plan.clinicDay, "th")}` : `Starts on ${getDayLabel(plan.clinicDay, "en")}`}
          schedule={plan.firstWeek}
          lang={lang}
        />
        <ScheduleView
          title={t[lang].maintenanceWeekTitle}
          subtitle={t[lang].maintenanceWeekSubtitle}
          schedule={plan.maintenanceWeek}
          lang={lang}
        />
      </div>

      <div className="instructions">
        <strong>{t[lang].warningTitle}</strong>
        <p>{t[lang].warningText}</p>
      </div>
    </section>
  );
}

function ScheduleView({
  title,
  subtitle,
  schedule,
  lang = "th",
}: {
  title: string;
  subtitle: string;
  schedule: DayDose[];
  lang?: "th" | "en";
}) {
  return (
    <div className="schedule-block">
      <div className="mb-3">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="space-y-2">
        {schedule.map((day) => (
          <div key={day.day} className={`day-row ${day.hold ? "hold" : ""}`}>
            <div>
              <strong>{getDayLabel(day.day, lang)}</strong>
              <span>{day.hold ? (lang === "th" ? "งดทานยา" : "HOLD") : `${day.dose} mg`}</span>
            </div>
            <PillVisual combo={day.combo} hold={day.hold} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleEditor({
  schedule,
  onChange,
  onKeyDown,
}: {
  schedule: DayDose[];
  onChange: (schedule: DayDose[]) => void;
  onKeyDown?: (e: React.KeyboardEvent, currentId: string) => void;
}) {
  return (
    <div className="schedule-editor">
      {schedule.map((day) => (
        <label key={day.day} className="editor-row">
          <span>{dayLabels[day.day]}</span>
          <span className="select-wrap">
            <select
              id={`dose-${day.day}`}
              value={day.dose}
              onChange={(event) => {
                const dose = Number(event.target.value);
                onChange(
                  schedule.map((item) =>
                    item.day === day.day ? { ...item, dose, combo: comboForDose(dose), hold: dose === 0 } : item
                  )
                );
              }}
              onKeyDown={(e) => onKeyDown?.(e, `dose-${day.day}`)}
            >
              {doseOptions.map((dose) => (
                <option key={dose} value={dose}>
                  {dose} mg
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </span>
          <PillVisual combo={day.combo} lang="en" />
        </label>
      ))}
    </div>
  );
}

function PillVisual({ combo, hold, lang = "th" }: { combo: DayDose["combo"]; hold?: boolean; lang?: "th" | "en" }) {
  if (hold || combo.dose === 0) return <span className="hold-pill">{lang === "th" ? "งดทานยา" : "HOLD"}</span>;
  const pills = [
    ...Array.from({ length: combo.orangeWhole }, (_, index) => <span key={`ow-${index}`} className="pill orange">2</span>),
    ...Array.from({ length: combo.orangeHalf }, (_, index) => <span key={`oh-${index}`} className="pill orange half">1/2</span>),
    ...Array.from({ length: combo.blueWhole }, (_, index) => <span key={`bw-${index}`} className="pill blue">3</span>),
    ...Array.from({ length: combo.blueHalf }, (_, index) => <span key={`bh-${index}`} className="pill blue half">1/2</span>),
  ];
  return <span className="pills">{pills}</span>;
}

function StatusBanner({ suggestion }: { suggestion: ReturnType<typeof getSuggestion> }) {
  return (
    <div className={`status ${suggestion.severity}`}>
      <AlertTriangle size={20} />
      <div>
        <strong>{suggestion.label}</strong>
        {suggestion.messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    </div>
  );
}

function HardStop({ reasons }: { reasons: string[] }) {
  return (
    <Panel title="Urgent Clinical Review" icon={<ShieldAlert size={18} />}>
      <div className="hard-stop">
        <h2>Do not generate routine dosing instructions.</h2>
        <p>This case meets Hard Stop criteria. Use local urgent evaluation and reversal protocols as clinically appropriate.</p>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

function Panel({
  title,
  icon,
  children,
  id,
  className,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`panel ${className || ""}`}>
      <div className="panel-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value, tone = "normal" }: { label: string; value: string; tone?: "normal" | "caution" | "danger" }) {
  return (
    <div className={`metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  id,
  shortcut,
  onKeyDown,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  id?: string;
  shortcut?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [inputValue, setInputValue] = useState(value.toString());

  useEffect(() => {
    if (Number(inputValue) !== value) {
      setInputValue(value.toString());
    }
  }, [value, inputValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = event.target.value;
    setInputValue(valStr);

    const parsed = Number(valStr);
    if (!isNaN(parsed) && valStr !== "") {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (inputValue === "" || isNaN(Number(inputValue))) {
      onChange(min);
      setInputValue(min.toString());
    } else {
      const parsed = Number(inputValue);
      const bounded = Math.max(min, Math.min(max, parsed));
      onChange(bounded);
      setInputValue(bounded.toString());
    }
  };

  return (
    <label className="field">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        {shortcut && (
          <kbd className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold select-none border border-slate-200">
            {shortcut}
          </kbd>
        )}
      </span>
      <input
        id={id}
        type="number"
        value={inputValue}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target.select()}
      />
    </label>
  );
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  id,
  shortcut,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  id?: string;
  shortcut?: string;
}) {
  return (
    <button
      id={id}
      className="icon-button"
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} [${shortcut}]` : label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SavedPlanList({ plans, onSelect, onDelete }: { plans: MedicationPlan[]; onSelect: (plan: MedicationPlan) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {plans.map((plan) => (
        <div key={plan.id} className="saved-plan">
          <button onClick={() => onSelect(plan)}>
            <strong>{plan.wCode}</strong>
            <span>{plan.issuedDate} · {plan.scheduleWeeklyDose.toFixed(1)} mg/week</span>
          </button>
          <button className="trash" onClick={() => onDelete(plan.id)} title="Delete saved plan">
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}

async function synthesizeGoogleTts(text: string, apiKey: string, gender: "female" | "male"): Promise<string> {
  const voiceName = gender === "female" ? "th-TH-Neural2-C" : "th-TH-Chirp3-HD-Achird";
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { ssml: text },
      voice: {
        languageCode: "th-TH",
        name: voiceName,
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate: 0.93,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google TTS API returned status ${response.status}: ${errText}`);
  }

  const data = await response.json();
  return data.audioContent;
}

async function speakPlan(plan: MedicationPlan, gender: "female" | "male" = "female") {
  const speechText = planSpeech(plan, gender);
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_TTS_API_KEY;

  if (apiKey) {
    try {
      const cacheKey = `warfarinpro.audio.${plan.id}.${gender}`;
      let audioContent = sessionStorage.getItem(cacheKey);

      if (!audioContent) {
        audioContent = await synthesizeGoogleTts(speechText, apiKey, gender);
        sessionStorage.setItem(cacheKey, audioContent);
      }

      const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
      await audio.play();
      return;
    } catch (error) {
      console.error("Google Cloud TTS failed, falling back to browser TTS:", error);
    }
  }

  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const plainText = speechText.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const utterance = new SpeechSynthesisUtterance(plainText);
  utterance.lang = "th-TH";
  utterance.rate = 0.75;
  window.speechSynthesis.speak(utterance);
}
