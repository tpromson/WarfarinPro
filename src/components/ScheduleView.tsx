import { getDayLabel, getPillComboDesc } from "../i18n";
import PillVisual from "./PillVisual";
import type { DayDose } from "../types";

export default function ScheduleView({
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
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[14px]">{day.hold ? (lang === "th" ? "งดทานยา" : "HOLD") : `${day.dose} mg`}</span>
                {!day.hold && (
                  <span className="text-[11px] text-slate-500 font-bold bg-slate-100 rounded px-1.5 py-0.5 print:bg-transparent print:p-0">
                    ({getPillComboDesc(day.combo, day.hold, lang)})
                  </span>
                )}
              </div>
            </div>
            <PillVisual combo={day.combo} hold={day.hold} lang={lang} />
          </div>
        ))}
      </div>
    </div>
  );
}
