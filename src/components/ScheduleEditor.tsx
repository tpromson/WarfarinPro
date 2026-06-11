import { useMemo, useState } from "react";
import { ChevronDown, Copy, Repeat, Undo } from "lucide-react";
import { comboForDose, dayLabels, getPillCombos } from "../clinical";
import PillVisual from "./PillVisual";
import type { DayDose, DayKey } from "../types";

const days: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function ScheduleEditor({
  schedule,
  onChange,
  onKeyDown,
  onReset,
  isModified,
  usePink = true,
}: {
  schedule: DayDose[];
  onChange: (schedule: DayDose[]) => void;
  onKeyDown?: (e: React.KeyboardEvent, currentId: string) => void;
  onReset?: () => void;
  isModified?: boolean;
  usePink?: boolean;
}) {
  const [showAlternate, setShowAlternate] = useState(false);
  const [oddDose, setOddDose] = useState(3);
  const [evenDose, setEvenDose] = useState(3);

  const doseOptions = useMemo(() => {
    return getPillCombos(usePink)
      .map((combo) => combo.dose)
      .filter((dose) => dose <= 12);
  }, [usePink]);

  function copyToAllDays(dose: number) {
    onChange(
      schedule.map((item) => ({
        ...item,
        dose,
        combo: comboForDose(dose, usePink),
        hold: dose === 0,
      })),
    );
  }

  function applyAlternate() {
    onChange(
      schedule.map((item) => {
        const dayIndex = days.indexOf(item.day);
        const dose = dayIndex % 2 === 0 ? oddDose : evenDose; // 0-indexed: mon(0), tue(1), ...
        return { ...item, dose, combo: comboForDose(dose, usePink), hold: dose === 0 };
      }),
    );
    setShowAlternate(false);
  }

  return (
    <div className="space-y-2">
      <div className="schedule-editor">
        {schedule.map((day) => (
          <label key={day.day} className="editor-row">
            <span className="flex items-center gap-1">
              <span>{dayLabels[day.day]}</span>
              <button
                type="button"
                onClick={() => copyToAllDays(day.dose)}
                className="inline-flex items-center justify-center p-0.5 rounded text-slate-400 hover:text-clinic-blue hover:bg-clinic-cyan/20 transition-colors focus-visible:outline-2 focus-visible:outline-clinic-blue"
                title="Copy this dose to all days"
                aria-label={`Copy ${day.dose} mg to all days`}
              >
                <Copy size={12} />
              </button>
            </span>
            <span className="select-wrap">
              <select
                id={`dose-${day.day}`}
                value={day.dose}
                onChange={(event) => {
                  const dose = Number(event.target.value);
                  onChange(
                    schedule.map((item) =>
                      item.day === day.day
                        ? { ...item, dose, combo: comboForDose(dose, usePink), hold: dose === 0 }
                        : item,
                    ),
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

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => setShowAlternate(!showAlternate)}
          className="flex items-center gap-2 text-xs font-bold text-clinic-blue hover:text-clinic-blue/80 transition-colors focus-visible:outline-2 focus-visible:outline-clinic-blue"
        >
          <Repeat size={14} />
          {showAlternate ? "Cancel" : "Alternate Odd/Even Days"}
        </button>

        {isModified && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 text-xs font-bold text-clinic-red hover:text-clinic-red/80 transition-colors focus-visible:outline-2 focus-visible:outline-clinic-red"
            title="Reset schedule back to the calculated recommendation"
          >
            <Undo size={14} />
            Reset to Suggestion
          </button>
        )}
      </div>

      {showAlternate && (
        <div className="border border-clinic-line/60 rounded-xl bg-slate-50 p-3 space-y-3">
          <p className="text-xs font-bold text-slate-600">Set alternating odd/even day doses</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              <span className="text-xs">Odd days (Mon, Wed, Fri, Sun)</span>
              <select
                value={oddDose}
                onChange={(e) => setOddDose(Number(e.target.value))}
                className="w-full"
              >
                {doseOptions.map((dose) => (
                  <option key={dose} value={dose}>
                    {dose} mg
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="text-xs">Even days (Tue, Thu, Sat)</span>
              <select
                value={evenDose}
                onChange={(e) => setEvenDose(Number(e.target.value))}
                className="w-full"
              >
                {doseOptions.map((dose) => (
                  <option key={dose} value={dose}>
                    {dose} mg
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={applyAlternate}
            className="px-4 py-1.5 bg-clinic-blue text-white font-bold text-xs rounded-lg hover:bg-clinic-blue/90 transition-colors focus-visible:outline-2 focus-visible:outline-clinic-blue"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  );
}
