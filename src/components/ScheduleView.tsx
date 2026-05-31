import { getDayLabel, getPillComboDesc } from "../i18n";
import PillVisual from "./PillVisual";
import type { DayDose, DayKey } from "../types";

const dayKeys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export default function ScheduleView({
  title,
  subtitle,
  schedule,
  lang = "th",
  isFirstWeek = false,
  clinicDay,
}: {
  title: string;
  subtitle: string;
  schedule: DayDose[];
  lang?: "th" | "en";
  isFirstWeek?: boolean;
  clinicDay?: DayKey;
}) {
  const clinicIndex = clinicDay ? dayKeys.indexOf(clinicDay) : 0;

  // We display in Monday-to-Sunday order!
  const sortedSchedule = isFirstWeek && clinicDay
    ? dayKeys.map((dayKey) => {
        const dayDose = schedule.find((d) => d.day === dayKey);
        const isBeforeClinic = dayKeys.indexOf(dayKey) < clinicIndex;
        return {
          day: dayKey,
          dose: dayDose?.dose ?? 0,
          hold: dayDose?.hold ?? false,
          combo: dayDose?.combo ?? { dose: 0, orangeWhole: 0, orangeHalf: 0, blueWhole: 0, blueHalf: 0, score: 0 },
          isBeforeClinic,
        };
      })
    : schedule;

  const hasSpilloverHold = isFirstWeek && clinicDay === "sun" && schedule.some(d => d.day === "mon" && d.hold);

  return (
    <div className="schedule-block">
      <div className="mb-3">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      <div className="space-y-2">
        {sortedSchedule.map((day) => {
          const isBefore = "isBeforeClinic" in day && day.isBeforeClinic;
          return (
            <div
              key={day.day}
              className={`day-row ${day.hold ? "hold" : ""} ${
                isBefore
                  ? "past bg-slate-50/50 border-dashed border-slate-200 text-slate-400 opacity-60 pointer-events-none"
                  : ""
              }`}
            >
              <div>
                <strong>{getDayLabel(day.day, lang)}</strong>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {isBefore ? (
                    <span className="text-[12px] font-bold text-slate-400 italic">
                      {lang === "th" ? "ก่อนวันปรับยา" : "Before visit"}
                    </span>
                  ) : (
                    <>
                      <span className="text-[14px]">
                        {day.hold ? (lang === "th" ? "งดทานยา" : "HOLD") : `${day.dose} mg`}
                      </span>
                      {!day.hold && (
                        <span className="text-[11px] text-slate-500 font-bold bg-slate-100 rounded px-1.5 py-0.5 print:bg-transparent print:p-0">
                          ({getPillComboDesc(day.combo, day.hold, lang)})
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {isBefore ? (
                <span className="text-slate-400 font-bold text-lg select-none px-4">-</span>
              ) : (
                <PillVisual combo={day.combo} hold={day.hold} lang={lang} />
              )}
            </div>
          );
        })}
      </div>
      {hasSpilloverHold && (
        <div className="mt-2.5 p-2 bg-red-50 border border-red-100 text-red-800 text-[11px] rounded font-bold">
          {lang === "th"
            ? "⚠️ ต้องงดยาต่อในวันจันทร์ถัดไปด้วย (ตามที่ระบุในตารางปฏิทิน)"
            : "⚠️ Hold must continue on the following Monday."}
        </div>
      )}
    </div>
  );
}
