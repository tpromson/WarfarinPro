import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ChevronDown,
  HeartPulse,
  ShieldAlert,
} from "lucide-react";
import {
  buildMaintenanceSchedule,
  buildPatientUrl,
  contextLabels,
  dayLabels,
  days,
  getSuggestion,
  interactionLabels,
  makePlan,
  roundToHalf,
} from "../clinical";
import type { ContextFlag, DayDose, DayKey, InteractionFlag, MedicationPlan, TargetRange } from "../types";
import BookletAndSharePanelContent from "./BookletAndSharePanelContent";
import Panel from "./Panel";
import Metric from "./Metric";
import NumberField from "./NumberField";
import StatusBanner from "./StatusBanner";
import HardStop from "./HardStop";
import ScheduleEditor from "./ScheduleEditor";
import BookletAndSharePanel from "./BookletAndSharePanel";
import MedicationSheet from "./MedicationSheet";

const interactionKeys = Object.keys(interactionLabels) as InteractionFlag[];
const contextKeys: ContextFlag[] = ["mechanicalValve", "pregnancy", "liverDisease"];

export default function DoctorMode({
  onOpenPatient,
  lang,
  printLayout,
  setPrintLayout,
}: {
  onOpenPatient: (plan: MedicationPlan) => void;
  lang: "th" | "en";
  printLayout: "half-a4" | "label";
  setPrintLayout: (layout: "half-a4" | "label") => void;
}) {
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

      let key = e.key.toLowerCase();
      if (e.code && e.code.startsWith("Key")) {
        key = e.code.slice(3).toLowerCase();
      }

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
        if (canShare && plan) {
          onOpenPatient(plan);
        }
      } else if (key === "c") {
        e.preventDefault();
        if (canShare && plan) {
          navigator.clipboard.writeText(buildPatientUrl(plan));
          alert(lang === "th" ? "คัดลอกลิงก์คนไข้เรียบร้อยแล้ว!" : "Patient link copied to clipboard!");
        }
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
    <div className="mx-auto grid gap-5 px-4 py-5 lg:grid-cols-[360px_1fr] grid-cols-1">
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
          <div className="check-grid md:grid-cols-2">
            {contextKeys.map((flag) => (
              <label key={flag} className="check">
                <input type="checkbox" checked={contexts.includes(flag)} onChange={() => toggleContext(flag)} />
                {contextLabels[flag]}
              </label>
            ))}
          </div>
          <div className="mt-3 text-xs font-semibold uppercase text-slate-500">Interaction flags</div>
          <div className="check-grid md:grid-cols-2">
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
                  printLayout={printLayout}
                  setPrintLayout={setPrintLayout}
                />
                <div className="print-sheet-wrapper">
                  <MedicationSheet plan={plan} lang={lang} printLayout={printLayout} />
                </div>
              </>
            ) : null}
          </>
        )}
      </section>

      {showSummaryModal && plan && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn print:hidden cursor-pointer"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="relative w-full max-w-4xl bg-white rounded-2xl shadow-soft border border-clinic-line overflow-hidden flex flex-col max-h-[90vh] cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-clinic-blue text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen size={19} />
                <h2 id="summary-modal-title" className="text-base font-bold">
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
                idPrefix="modal-"
                printLayout={printLayout}
                setPrintLayout={setPrintLayout}
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
