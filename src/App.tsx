import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  AlertTriangle,
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
  pillCombos,
  planSpeech,
  roundToHalf,
} from "./clinical";
import { deleteSavedPlan, loadSavedPlans, savePlan } from "./storage";
import { ContextFlag, DayDose, DayKey, InteractionFlag, MedicationPlan, TargetRange } from "./types";

const interactionKeys = Object.keys(interactionLabels) as InteractionFlag[];
const contextKeys: ContextFlag[] = ["mechanicalValve", "pregnancy", "liverDisease"];
const doseOptions = pillCombos.map((combo) => combo.dose).filter((dose) => dose <= 12);

export default function App() {
  const [active, setActive] = useState<"doctor" | "patient">("doctor");
  const [openedPlan, setOpenedPlan] = useState<MedicationPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<MedicationPlan[]>([]);

  useEffect(() => {
    setSavedPlans(loadSavedPlans());
    const fromHash = parsePatientHash();
    if (fromHash) {
      setOpenedPlan(fromHash);
      setActive("patient");
    }
  }, []);

  return (
    <main className="min-h-screen bg-clinic-paper text-clinic-ink">
      <header className="sticky top-0 z-30 border-b border-clinic-line/60 bg-white/85 backdrop-blur-md shadow-[0_2px_15px_-3px_rgba(23,50,77,0.03)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-clinic-blue text-white">
              <HeartPulse size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">WarfarinPro</h1>
              <p className="text-xs text-slate-600">Physician-directed warfarin support</p>
            </div>
          </div>
          <div className="segmented print:hidden">
            <button className={active === "doctor" ? "active" : ""} onClick={() => setActive("doctor")}>
              <ShieldAlert size={16} /> Doctor
            </button>
            <button className={active === "patient" ? "active" : ""} onClick={() => setActive("patient")}>
              <UserRound size={16} /> Patient
            </button>
          </div>
        </div>
      </header>

      {active === "doctor" ? (
        <DoctorMode
          onOpenPatient={(plan) => {
            setOpenedPlan(plan);
            setActive("patient");
          }}
        />
      ) : (
        <PatientMode
          plan={openedPlan}
          savedPlans={savedPlans}
          onSave={(plan) => setSavedPlans(savePlan(plan))}
          onDelete={(id) => setSavedPlans(deleteSavedPlan(id))}
          onSelect={setOpenedPlan}
        />
      )}
    </main>
  );
}

function DoctorMode({ onOpenPatient }: { onOpenPatient: (plan: MedicationPlan) => void }) {
  const [inr, setInr] = useState(2.4);
  const [previousDose, setPreviousDose] = useState(35);
  const [preset, setPreset] = useState<"standard" | "mechanical" | "custom">("standard");
  const [customLower, setCustomLower] = useState(2);
  const [customUpper, setCustomUpper] = useState(3);
  const [clinicDay, setClinicDay] = useState<DayKey>("thu");
  const [majorBleeding, setMajorBleeding] = useState(false);
  const [interactions, setInteractions] = useState<InteractionFlag[]>([]);
  const [contexts, setContexts] = useState<ContextFlag[]>([]);

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
          <NumberField label="Current INR" value={inr} step={0.1} min={0.5} max={12} onChange={setInr} />
          <NumberField label="Previous weekly dose (mg)" value={previousDose} step={0.5} min={0} max={99.9} onChange={setPreviousDose} />
          <label className="field">
            Target range
            <span className="select-wrap">
              <select value={preset} onChange={(event) => setPreset(event.target.value as typeof preset)}>
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
            Clinic visit day
            <span className="select-wrap">
              <select value={clinicDay} onChange={(event) => setClinicDay(event.target.value as DayKey)}>
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
          <label className="check danger">
            <input type="checkbox" checked={majorBleeding} onChange={(event) => setMajorBleeding(event.target.checked)} />
            Major bleeding
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
                  Selected adjustment
                  <span className="select-wrap">
                    <select value={selectedAdjustment} onChange={(event) => setSelectedAdjustment(Number(event.target.value))}>
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
                  First week hold doses
                  <span className="select-wrap">
                    <select value={holdDoses} onChange={(event) => setHoldDoses(Number(event.target.value))}>
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
              <ScheduleEditor schedule={maintenance} onChange={setMaintenance} />
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
              <SharePanel plan={plan} disabled={!canShare} onOpenPatient={onOpenPatient} />
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function PatientMode({
  plan,
  savedPlans,
  onSave,
  onDelete,
  onSelect,
}: {
  plan: MedicationPlan | null;
  savedPlans: MedicationPlan[];
  onSave: (plan: MedicationPlan) => void;
  onDelete: (id: string) => void;
  onSelect: (plan: MedicationPlan) => void;
}) {
  const [showCalMenu, setShowCalMenu] = useState(false);
  const [speakGender, setSpeakGender] = useState<"female" | "male">("female");

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
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <Panel title="Saved Plans" icon={<Home size={18} />}>
          {savedPlans.length === 0 ? (
            <p className="text-slate-600">No plan is open. Scan or open a WarfarinPro plan link, or create one in Doctor Mode.</p>
          ) : (
            <SavedPlanList plans={savedPlans} onSelect={onSelect} onDelete={onDelete} />
          )}
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-2xl font-bold">Patient Viewer</h2>
          <p className="text-sm text-slate-600">No patient identity is stored in this plan.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="segmented print:hidden">
            <button className={speakGender === "female" ? "active" : ""} onClick={() => setSpeakGender("female")}>
              👩‍⚕️ หญิง
            </button>
            <button className={speakGender === "male" ? "active" : ""} onClick={() => setSpeakGender("male")}>
              👨‍⚕️ ชาย
            </button>
          </div>
          <IconButton icon={<Speaker size={17} />} onClick={() => speakPlan(plan, speakGender)} label="ฟังเสียงไทย" />
          
          <div className="relative dropdown-container">
            <IconButton icon={<CalendarDays size={17} />} onClick={() => setShowCalMenu(!showCalMenu)} label="เพิ่มลงปฏิทิน" />
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
                    <span>ดาวน์โหลดปฏิทิน (.ics)</span>
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 text-left font-semibold"
                    onClick={() => {
                      setShowCalMenu(false);
                      window.open(generateGoogleCalendarUrl(plan), "_blank");
                    }}
                  >
                    <CalendarDays size={15} className="text-orange-500" />
                    <span>เพิ่มลง Google Calendar</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <IconButton icon={<Save size={17} />} onClick={() => onSave(plan)} label="Save offline" />
          <IconButton icon={<Printer size={17} />} onClick={() => window.print()} label="Print" />
        </div>
      </div>
      <MedicationSheet plan={plan} />
      {savedPlans.length ? (
        <div className="mt-5 print:hidden">
          <Panel title="Saved Plans" icon={<Home size={18} />}>
            <SavedPlanList plans={savedPlans} onSelect={onSelect} onDelete={onDelete} />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}

function SharePanel({ plan, disabled, onOpenPatient }: { plan: MedicationPlan; disabled: boolean; onOpenPatient: (plan: MedicationPlan) => void }) {
  const [qr, setQr] = useState("");
  const url = useMemo(() => buildPatientUrl(plan), [plan]);

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 240 }).then(setQr).catch(() => setQr(""));
  }, [url]);

  const lineText = `WarfarinPro ${plan.wCode}\nWeekly dose ${plan.scheduleWeeklyDose.toFixed(1)} mg\nOpen plan: ${url}`;

  return (
    <Panel title="Share and Print" icon={<QrCode size={18} />}>
      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <div className="qr-box">{qr ? <img src={qr} alt="Plan QR" /> : <QrCode size={72} />}</div>
        <div className="space-y-3">
          <div className="rounded-lg border border-clinic-line bg-white p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Patient link</div>
            <div className="mt-1 break-all text-sm">{url}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <IconButton disabled={disabled} icon={<UserRound size={17} />} onClick={() => onOpenPatient(plan)} label="Open patient view" />
            <IconButton disabled={disabled} icon={<Copy size={17} />} onClick={() => navigator.clipboard.writeText(url)} label="Copy link" />
            <IconButton disabled={disabled} icon={<MessageCircle size={17} />} onClick={() => window.open(`https://line.me/R/msg/text/?${encodeURIComponent(lineText)}`, "_blank")} label="LINE share" />
            <IconButton disabled={disabled} icon={<Printer size={17} />} onClick={() => window.print()} label="Print" />
          </div>
          {disabled ? <p className="warning">Sharing is disabled until the schedule is valid and W-code is encodable.</p> : null}
        </div>
      </div>
    </Panel>
  );
}

function MedicationSheet({ plan }: { plan: MedicationPlan }) {
  return (
    <section className="sheet">
      <div className="sheet-head">
        <div>
          <h2>Warfarin Medication Sheet</h2>
          <p>แผนยาวาร์ฟารินสำหรับผู้ป่วย</p>
        </div>
        <div className="wcode">{plan.wCode}</div>
      </div>

      <div className="blank-grid">
        <span>ชื่อผู้ป่วย: ____________________</span>
        <span>HN: ____________________</span>
        <span>วันนัด: ____________________</span>
        <span>ลายเซ็นแพทย์: ____________________</span>
      </div>

      <div className="sheet-metrics">
        <Metric label="Weekly dose" value={`${plan.scheduleWeeklyDose.toFixed(1)} mg`} />
        <Metric label="Target INR" value={`${plan.target.lower.toFixed(1)}-${plan.target.upper.toFixed(1)}`} />
        <Metric label="Issued" value={plan.issuedDate} />
      </div>

      {plan.safety.severity !== "normal" || plan.safety.messages.length ? (
        <div className={`safety ${plan.safety.severity}`}>
          <AlertTriangle size={18} />
          <div>
            <strong>Safety review</strong>
            {plan.safety.messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <ScheduleView title="First Week" subtitle={`เริ่มวัน${dayLabels[plan.clinicDay]}`} schedule={plan.firstWeek} />
        <ScheduleView title="Maintenance Week" subtitle="ตารางประจำ จันทร์-อาทิตย์" schedule={plan.maintenanceWeek} />
      </div>

      <div className="instructions">
        <strong>คำเตือน</strong>
        <p>หากมีเลือดออกผิดปกติ อุจจาระดำ ปัสสาวะเป็นเลือด เวียนศีรษะมาก หรือหกล้มกระแทกศีรษะ ให้ติดต่อโรงพยาบาลทันที</p>
      </div>
    </section>
  );
}

function ScheduleView({ title, subtitle, schedule }: { title: string; subtitle: string; schedule: DayDose[] }) {
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
              <strong>{dayLabels[day.day]}</strong>
              <span>{day.hold ? "งดยา" : `${day.dose} mg`}</span>
            </div>
            <PillVisual combo={day.combo} hold={day.hold} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ScheduleEditor({ schedule, onChange }: { schedule: DayDose[]; onChange: (schedule: DayDose[]) => void }) {
  return (
    <div className="schedule-editor">
      {schedule.map((day) => (
        <label key={day.day} className="editor-row">
          <span>{dayLabels[day.day]}</span>
          <span className="select-wrap">
            <select
              value={day.dose}
              onChange={(event) => {
                const dose = Number(event.target.value);
                onChange(schedule.map((item) => (item.day === day.day ? { ...item, dose, combo: comboForDose(dose), hold: dose === 0 } : item)));
              }}
            >
              {doseOptions.map((dose) => (
                <option key={dose} value={dose}>
                  {dose} mg
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </span>
          <PillVisual combo={day.combo} />
        </label>
      ))}
    </div>
  );
}

function PillVisual({ combo, hold }: { combo: DayDose["combo"]; hold?: boolean }) {
  if (hold || combo.dose === 0) return <span className="hold-pill">HOLD</span>;
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

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel">
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

function NumberField({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <label className="field">
      {label}
      <input type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function IconButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button className="icon-button" onClick={onClick} disabled={disabled} title={label}>
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
