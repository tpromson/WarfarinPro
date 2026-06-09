import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle } from "lucide-react";
import { buildPatientUrl, days, isFirstWeekOver } from "../clinical";
import { getDayLabel, t } from "../i18n";
import Metric from "./Metric";
import ScheduleView from "./ScheduleView";
import type { MedicationPlan } from "../types";

function getPillComboShortDesc(
  combo: {
    orangeWhole: number;
    orangeHalf: number;
    blueWhole: number;
    blueHalf: number;
    dose: number;
  },
  hold?: boolean,
  lang: "th" | "en" = "th",
): string {
  if (hold || combo.dose === 0) return lang === "th" ? "งดยา" : "HOLD";
  const parts: string[] = [];
  if (lang === "th") {
    if (combo.orangeWhole > 0) parts.push(`ส้ม ${combo.orangeWhole}`);
    if (combo.orangeHalf > 0) parts.push(`ส้ม 1/2`);
    if (combo.blueWhole > 0) parts.push(`ฟ้า ${combo.blueWhole}`);
    if (combo.blueHalf > 0) parts.push(`ฟ้า 1/2`);
    return parts.length > 0 ? parts.join("+") : "งดยา";
  }
  if (combo.orangeWhole > 0) parts.push(`Or ${combo.orangeWhole}`);
  if (combo.orangeHalf > 0) parts.push(`Or 1/2`);
  if (combo.blueWhole > 0) parts.push(`Bl ${combo.blueWhole}`);
  if (combo.blueHalf > 0) parts.push(`Bl 1/2`);
  return parts.length > 0 ? parts.join("+") : "HOLD";
}

export default function MedicationSheet({
  plan,
  lang = "th",
  printLayout = "half-a4",
}: {
  plan: MedicationPlan;
  lang?: "th" | "en";
  printLayout?: "half-a4" | "label";
}) {
  const [qr, setQr] = useState("");
  const url = useMemo(() => buildPatientUrl(plan), [plan]);

  useEffect(() => {
    QRCode.toDataURL(url, { errorCorrectionLevel: "Q", margin: 2, width: 400 })
      .then(setQr)
      .catch((err) => console.error("QR Code Error in MedicationSheet:", err));
  }, [url]);

  const pageStyle =
    printLayout === "half-a4"
      ? `@media print { @page { size: A5 portrait; margin: 5mm; } }`
      : `@media print { @page { size: 90mm auto; margin: 0; } }`;

  if (printLayout === "label") {
    return (
      <>
        {pageStyle && <style dangerouslySetInnerHTML={{ __html: pageStyle }} />}
        <section className="sheet layout-label">
          <div className="label-body">
            {/* Left Column: QR Code (main) */}
            <div className="label-qr-container">
              {qr && (
                <div className="label-qr-wrapper">
                  <img
                    src={qr}
                    alt={
                      lang === "th"
                        ? "QR โค้ดสำหรับเปิดตารางยาบนมือถือ"
                        : "QR code linking to full medication schedule"
                    }
                    className="label-qr-img"
                  />
                  <span className="label-qr-caption">
                    {lang === "th" ? "สแกนดูตาราง/ฟังเสียง" : "Scan for details/audio"}
                  </span>
                </div>
              )}
              <div className="label-wcode-box">
                <span className="label-wcode-title">W-Code</span>
                <span className="label-wcode">{plan.wCode}</span>
              </div>
            </div>

            {/* Right Column: Dosing Schedule Table */}
            <div className="label-schedule-container">
              <table className="label-schedule-table">
                <thead>
                  <tr>
                    <th>{lang === "th" ? "วัน" : "Day"}</th>
                    <th>{lang === "th" ? "สัปดาห์แรก" : "1st Wk"}</th>
                    <th>{lang === "th" ? "สัปดาห์ถัดไป" : "Maint"}</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((day) => {
                    const firstWeekDay = plan.firstWeek.find((d) => d.day === day);
                    const maintDay = plan.maintenanceWeek.find((d) => d.day === day);
                    const isBeforeClinic = days.indexOf(day) < days.indexOf(plan.clinicDay);
                    const firstWeekDesc = isBeforeClinic
                      ? "-"
                      : firstWeekDay
                        ? firstWeekDay.hold
                          ? lang === "th"
                            ? "งดยา"
                            : "HOLD"
                          : `${firstWeekDay.dose}mg (${getPillComboShortDesc(firstWeekDay.combo, false, lang)})`
                        : "-";
                    const maintDesc = maintDay
                      ? maintDay.dose === 0
                        ? lang === "th"
                          ? "งดยา"
                          : "HOLD"
                        : `${maintDay.dose}mg (${getPillComboShortDesc(maintDay.combo, false, lang)})`
                      : "-";

                    return (
                      <tr key={day}>
                        <td>
                          <strong>{getDayLabel(day, lang).substring(0, 3)}</strong>
                        </td>
                        <td>{firstWeekDesc}</td>
                        <td>{maintDesc}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          <div className="label-footer">
            <span className="label-warning-text">
              {lang === "th"
                ? "⚠️ พบแพทย์ทันทีหากมีเลือดออกผิดปกติ อุจจาระดำ"
                : "⚠️ Seek immediate medical care if bleeding occurs."}
            </span>
          </div>
        </section>
      </>
    );
  }

  const firstWeekPassed = isFirstWeekOver(plan);

  // A5 Landscape Layout
  return (
    <>
      {pageStyle && <style dangerouslySetInnerHTML={{ __html: pageStyle }} />}
      <section className="sheet layout-half-a4">
        <div className="sheet-head">
          <div>
            <h2>{lang === "th" ? "ตารางแนะนำการรับประทานยา" : "Warfarin Medication Sheet"}</h2>
            <p>
              {lang === "th" ? "Warfarin Medication Sheet" : "Medication dosing plan for patients"}
            </p>
          </div>
          <div className="header-meta-group flex items-center gap-2">
            {qr && (
              <div className="flex items-center gap-1">
                <div className="flex flex-col items-center gap-0.5">
                  <img
                    src={qr}
                    alt={
                      lang === "th"
                        ? "QR โค้ดสำหรับเปิดตารางยาบนมือถือ"
                        : "QR code linking to full medication schedule"
                    }
                    className="h-24 w-24 border border-clinic-line rounded p-0.5 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 font-extrabold">
                    {lang === "th" ? "สแกนดูตารางยา" : "Scan Schedule"}
                  </span>
                </div>
                <div className="wcode">{plan.wCode}</div>
              </div>
            )}
          </div>
        </div>

        <div className="sheet-info-row">
          <div className="blank-grid">
            <span>{t[lang].patientName}: ____________________</span>
            <span>{t[lang].hn}: ____________________</span>
            <span>{t[lang].appointment}: ____________________</span>
            <span>{t[lang].physicianSignature}: ____________________</span>
          </div>
          <div className="sheet-metrics">
            <Metric label={t[lang].weeklyDose} value={`${plan.scheduleWeeklyDose.toFixed(1)} mg`} />
            <Metric
              label={t[lang].targetInr}
              value={`${plan.target.lower.toFixed(1)}-${plan.target.upper.toFixed(1)}`}
            />
            <Metric label={t[lang].issued} value={plan.issuedDate} />
          </div>
        </div>

        {plan.safety.severity !== "normal" || plan.safety.messages.length ? (
          <div className={`safety ${plan.safety.severity}`}>
            <AlertTriangle size={16} />
            <div>
              <strong>{lang === "th" ? "การประเมินความปลอดภัย" : "Safety review"}</strong>
              {plan.safety.messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          </div>
        ) : null}

        {firstWeekPassed ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-3 text-xs font-bold flex items-center gap-2">
              <span>✓</span>
              <span>
                {lang === "th"
                  ? `ผ่านช่วงสัปดาห์แรกแล้ว (${plan.firstWeekHoldDoses > 0 ? `งดยา ${plan.firstWeekHoldDoses} วันแรก เริ่ม${getDayLabel(plan.clinicDay, "th")}` : "ไม่มีงดยา"} — ใช้ตารางปกติต่อไปนี้)`
                  : `First week completed (${plan.firstWeekHoldDoses > 0 ? `${plan.firstWeekHoldDoses} hold day(s) starting ${getDayLabel(plan.clinicDay, "en")}` : "no holds"} — follow regular schedule below)`}
              </span>
            </div>
            <ScheduleView
              title={t[lang].maintenanceWeekTitle}
              subtitle={t[lang].maintenanceWeekSubtitle}
              schedule={plan.maintenanceWeek}
              lang={lang}
            />
          </div>
        ) : (
          <div className="grid gap-3 landscape-grid-cols-2">
            <ScheduleView
              title={t[lang].firstWeekTitle}
              subtitle={
                lang === "th"
                  ? `เริ่ม${getDayLabel(plan.clinicDay, "th")}`
                  : `Starts on ${getDayLabel(plan.clinicDay, "en")}`
              }
              schedule={plan.firstWeek}
              lang={lang}
              isFirstWeek={true}
              clinicDay={plan.clinicDay}
            />
            <ScheduleView
              title={t[lang].maintenanceWeekTitle}
              subtitle={t[lang].maintenanceWeekSubtitle}
              schedule={plan.maintenanceWeek}
              lang={lang}
            />
          </div>
        )}

        <div className="instructions">
          <strong>{t[lang].warningTitle}</strong>
          <p>{t[lang].warningText}</p>
        </div>
      </section>
    </>
  );
}
