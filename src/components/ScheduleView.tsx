import { AlertTriangle } from "lucide-react";
import { getDayLabel, getPillComboDesc } from "../i18n";
import PillVisual from "./PillVisual";
import type { DayDose, DayKey } from "../types";

const dayKeys: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const jsDayToKey: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export default function ScheduleView({
  title,
  subtitle,
  schedule,
  lang = "th",
  isFirstWeek = false,
  clinicDay,
  isCurrent = false,
}: {
  title: string;
  subtitle: string;
  schedule: DayDose[];
  lang?: "th" | "en";
  isFirstWeek?: boolean;
  clinicDay?: DayKey;
  isCurrent?: boolean;
}) {
  const clinicIndex = clinicDay ? dayKeys.indexOf(clinicDay) : 0;
  const todayKey = jsDayToKey[new Date().getDay()];

  // We display in Monday-to-Sunday order!
  const sortedSchedule =
    isFirstWeek && clinicDay
      ? dayKeys.map((dayKey) => {
          const dayDose = schedule.find((d) => d.day === dayKey);
          const isBeforeClinic = dayKeys.indexOf(dayKey) < clinicIndex;
          return {
            day: dayKey,
            dose: dayDose?.dose ?? 0,
            hold: dayDose?.hold ?? false,
            combo: dayDose?.combo ?? {
              dose: 0,
              orangeWhole: 0,
              orangeHalf: 0,
              blueWhole: 0,
              blueHalf: 0,
              pinkWhole: 0,
              pinkHalf: 0,
              score: 0,
            },
            isBeforeClinic,
          };
        })
      : schedule;

  const hasSpilloverHold =
    isFirstWeek && clinicDay === "sun" && schedule.some((d) => d.day === "mon" && d.hold);

  return (
    <div className="schedule-block">
      <div className="mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3>{title}</h3>
          {isCurrent && (
            <span
              className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full"
              style={{ background: "rgba(23,96,135,0.1)", color: "#176087" }}
            >
              {lang === "th" ? "ตอนนี้" : "Now"}
            </span>
          )}
        </div>
        <p>{subtitle}</p>
      </div>
      <div className="space-y-2">
        {sortedSchedule.map((day) => {
          const isBefore = "isBeforeClinic" in day && day.isBeforeClinic;
          const isToday = isCurrent && day.day === todayKey && !isBefore;
          return (
            <div
              key={day.day}
              className={`day-row ${day.hold ? "hold" : ""} ${isToday ? "today" : ""} ${
                isBefore
                  ? "past bg-slate-50/50 border-dashed border-slate-200 text-slate-400 opacity-60 pointer-events-none"
                  : ""
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <strong>{getDayLabel(day.day, lang)}</strong>
                  {isToday && (
                    <span
                      className="text-[9px] font-extrabold px-1 py-px rounded"
                      style={{ background: "#176087", color: "white" }}
                    >
                      {lang === "th" ? "วันนี้" : "Today"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                  {isBefore ? (
                    <span className="text-[12px] font-bold text-slate-400 italic">
                      {lang === "th" ? "ก่อนวันปรับยา" : "Before visit"}
                    </span>
                  ) : (
                    <>
                      <span
                        className={`text-[14px] ${day.hold ? "text-clinic-red font-extrabold" : ""}`}
                      >
                        {day.hold ? (lang === "th" ? "งดทานยา" : "HOLD") : `${day.dose} mg`}
                      </span>
                      {!day.hold && (
                        <span className="text-[11px] text-slate-600 font-semibold ml-1">
                          ({getPillComboDesc(day.combo, day.hold, lang)})
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
              {!isBefore ? (
                <span style={{ display: "inline-flex", justifyContent: "flex-end" }}>
                  <PillVisual combo={day.combo} hold={day.hold} lang={lang} />
                </span>
              ) : (
                <span className="text-slate-400 font-bold text-lg select-none pr-2">-</span>
              )}
            </div>
          );
        })}
      </div>
      {hasSpilloverHold && (
        <div className="mt-2.5 p-2 bg-red-50 border border-red-100 text-red-800 text-[11px] rounded font-bold flex items-center gap-1.5">
          <AlertTriangle size={12} className="shrink-0" aria-hidden="true" />
          {lang === "th"
            ? "ต้องงดยาต่อในวันจันทร์ถัดไปด้วย (ตามที่ระบุในตารางปฏิทิน)"
            : "Hold must continue on the following Monday."}
        </div>
      )}
    </div>
  );
}
