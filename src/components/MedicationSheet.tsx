import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, CheckCircle } from "lucide-react";
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

function pillDetailDesc(
  combo: { orangeWhole: number; orangeHalf: number; blueWhole: number; blueHalf: number; dose: number },
  lang: "th" | "en",
): string {
  if (combo.dose === 0) return lang === "th" ? "งดยา" : "HOLD";
  const parts: string[] = [];
  if (lang === "th") {
    if (combo.orangeWhole > 0) parts.push(`ส้ม ${combo.orangeWhole} เม็ด`);
    if (combo.orangeHalf > 0) parts.push(`ส้ม ½ เม็ด`);
    if (combo.blueWhole > 0) parts.push(`ฟ้า ${combo.blueWhole} เม็ด`);
    if (combo.blueHalf > 0) parts.push(`ฟ้า ½ เม็ด`);
    return parts.length > 0 ? parts.join("+") : "งดยา";
  }
  if (combo.orangeWhole > 0) parts.push(`Or×${combo.orangeWhole}`);
  if (combo.orangeHalf > 0) parts.push(`Or×½`);
  if (combo.blueWhole > 0) parts.push(`Bl×${combo.blueWhole}`);
  if (combo.blueHalf > 0) parts.push(`Bl×½`);
  return parts.length > 0 ? parts.join("+") : "HOLD";
}

export default function MedicationSheet({
  plan,
  lang = "th",
  printLayout = "half-a4",
}: {
  plan: MedicationPlan;
  lang?: "th" | "en";
  printLayout?: "half-a4" | "label" | "qr-sheet";
}) {
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const url = useMemo(() => buildPatientUrl(plan), [plan]);

  useEffect(() => {
    setQr("");
    setQrError(false);
    QRCode.toDataURL(url, { errorCorrectionLevel: "Q", margin: 2, width: 400 })
      .then(setQr)
      .catch((err) => {
        console.error("QR Code Error in MedicationSheet:", err);
        setQrError(true);
      });
  }, [url]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent =
      printLayout === "half-a4"
        ? `@media print { @page { size: A5 portrait; margin: 5mm; } }`
        : printLayout === "qr-sheet"
          ? `@media print { @page { size: 90mm 56mm; margin: 0; } }`
          : `@media print { @page { size: 90mm auto; margin: 0; } }`;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, [printLayout]);

  if (printLayout === "qr-sheet") {
    return (
      <section className="sheet layout-qr-sheet" aria-label={lang === "th" ? "ตารางยา + QR แยกดวง" : "Schedule + QR split stickers"}>
        {/* Sticker 1: Schedule table */}
        <div className="qr-sticker qr-sticker-schedule">
          <div className="qr-sticker-sched-header">
            <span className="qr-sticker-sched-wcode">{plan.wCode}</span>
            <span className="qr-sticker-sched-date">{plan.issuedDate}</span>
          </div>
          <table className="qr-sticker-sched-table">
            <thead>
              <tr>
                <th>{lang === "th" ? "วัน" : "Day"}</th>
                <th>{lang === "th" ? "สัปดาห์แรก" : "Wk 1"}</th>
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
                      ? lang === "th" ? "งดยา" : "HOLD"
                      : pillDetailDesc(firstWeekDay.combo, lang)
                    : "-";
                const maintDesc = maintDay
                  ? pillDetailDesc(maintDay.combo, lang)
                  : "-";
                return (
                  <tr key={day}>
                    <td className="qr-sched-day"><strong>{getDayLabel(day, lang).substring(0, 3)}</strong></td>
                    <td>{firstWeekDesc}</td>
                    <td>{maintDesc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="qr-sticker-cut" aria-hidden="true" />

        {/* Sticker 2: QR code */}
        <div className="qr-sticker qr-sticker-qr">
          <div className="qr-sticker-qr-col">
            {!qr && !qrError && (
              <div className="qr-sticker-img" style={{ background: "#f1f5f9" }} />
            )}
            {qrError && (
              <div className="qr-sticker-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#64748b", textAlign: "center" }}>
                {lang === "th" ? "QR ใช้งานไม่ได้" : "QR unavailable"}
              </div>
            )}
            {qr && !qrError && (
              <img src={qr} alt={lang === "th" ? "QR โค้ดตารางยา" : "Medication schedule QR"} className="qr-sticker-img" />
            )}
            <span className="qr-sticker-scan">{lang === "th" ? "สแกนดูตาราง/ฟังเสียง" : "Scan for schedule/audio"}</span>
          </div>
          <div className="qr-sticker-info-col">
            <span className="qr-sticker-wlabel">W-Code</span>
            <span className="qr-sticker-wcode">{plan.wCode}</span>
            <span className="qr-sticker-meta">Warfarin · {plan.issuedDate}</span>
          </div>
        </div>
      </section>
    );
  }

  if (printLayout === "label") {
    return (
      <>
        {/* Page 1: Schedule Table */}
        <section className="sheet layout-label layout-label-schedule" aria-label={lang === "th" ? "ตารางกินยา" : "Dosing schedule"}>
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
                      ? lang === "th" ? "งดยา" : "HOLD"
                      : `${firstWeekDay.dose}mg (${getPillComboShortDesc(firstWeekDay.combo, false, lang)})`
                    : "-";
                const maintDesc = maintDay
                  ? maintDay.dose === 0
                    ? lang === "th" ? "งดยา" : "HOLD"
                    : `${maintDay.dose}mg (${getPillComboShortDesc(maintDay.combo, false, lang)})`
                  : "-";
                return (
                  <tr key={day}>
                    <td><strong>{getDayLabel(day, lang).substring(0, 3)}</strong></td>
                    <td>{firstWeekDesc}</td>
                    <td>{maintDesc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="label-footer">
            <span className="label-warning-text" style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <AlertTriangle size={10} aria-hidden="true" />
              {lang === "th"
                ? "พบแพทย์ทันทีหากมีเลือดออกผิดปกติ อุจจาระดำ"
                : "Seek immediate medical care if bleeding occurs."}
            </span>
          </div>
        </section>

        {/* Page 2: QR + W-code */}
        <section className="sheet layout-label layout-label-qrcode" aria-label={lang === "th" ? "QR และรหัสยา" : "QR and medication code"}>
          <div className="label-qrpage-qr">
            {!qr && !qrError && (
              <div className="label-qrpage-img" style={{ background: "#f1f5f9" }} role="img" aria-label={lang === "th" ? "กำลังสร้าง QR" : "Generating QR"} />
            )}
            {qrError && (
              <div className="label-qrpage-img" style={{ display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", fontSize: 12, fontWeight: 800, color: "#475569", padding: 4, textAlign: "center" }}>
                {lang === "th" ? "QR ใช้งานไม่ได้" : "QR unavailable"}
              </div>
            )}
            {qr && !qrError && (
              <img src={qr} alt={lang === "th" ? "QR โค้ดตารางยา" : "Medication schedule QR"} className="label-qrpage-img" />
            )}
            <span className="label-qrpage-caption">{lang === "th" ? "สแกนดูตาราง/ฟังเสียง" : "Scan for schedule/audio"}</span>
          </div>
          <div className="label-qrpage-wcode">
            <span className="label-qrpage-wlabel">W-Code</span>
            <span className="label-qrpage-wvalue">{plan.wCode}</span>
          </div>
          <div className="label-qrpage-meta">Warfarin · {plan.issuedDate}</div>
        </section>
      </>
    );
  }

  const firstWeekPassed = isFirstWeekOver(plan);

  // A5 Landscape Layout
  return (
    <>
      <section className="sheet layout-half-a4" aria-label={lang === "th" ? "ใบแนะนำการรับประทานยา" : "Medication instruction sheet"}>
        <div className="sheet-head">
          <div>
            <h2>{lang === "th" ? "ตารางแนะนำการรับประทานยา" : "Warfarin Medication Sheet"}</h2>
            <p>
              {lang === "th" ? "Warfarin Medication Sheet" : "Medication dosing plan for patients"}
            </p>
          </div>
          <div className="header-meta-group flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="flex flex-col items-center gap-0.5">
                {!qr && !qrError && (
                  <div
                    className="h-24 w-24 border border-clinic-line rounded bg-slate-50"
                    role="img"
                    aria-label={lang === "th" ? "กำลังสร้าง QR" : "Generating QR"}
                  />
                )}
                {qrError && (
                  <div className="h-24 w-24 border border-clinic-line rounded bg-slate-50 flex items-center justify-center text-center text-[9px] text-slate-500 font-bold p-1">
                    {lang === "th" ? "QR ใช้งานไม่ได้ — ใช้ W-code" : "QR unavailable — use W-code"}
                  </div>
                )}
                {qr && !qrError && (
                  <img
                    src={qr}
                    alt={
                      lang === "th"
                        ? "QR โค้ดสำหรับเปิดตารางยาบนมือถือ"
                        : "QR code linking to full medication schedule"
                    }
                    className="h-24 w-24 border border-clinic-line rounded p-0.5 bg-white"
                  />
                )}
                <span className="text-[10px] text-slate-500 font-extrabold">
                  {lang === "th" ? "สแกนดูตารางยา" : "Scan Schedule"}
                </span>
              </div>
              <div className="flex flex-col items-center gap-0.5">
                <div
                  className="wcode"
                  title={
                    lang === "th"
                      ? "W-code: รหัสย่อแผนยา — ใช้สแกน QR หรือแจ้งเภสัชกรเมื่อโทรนัด"
                      : "W-code: compact plan reference — scan QR or quote to clinic when calling"
                  }
                >
                  {plan.wCode}
                </div>
                <span className="text-[9px] text-slate-400 font-bold text-center leading-tight max-w-[80px]">
                  {lang === "th" ? "รหัสแผนยา" : "Plan code"}
                </span>
              </div>
            </div>
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
            <div className="status normal">
              <CheckCircle size={16} aria-hidden="true" />
              <div>
                <strong>
                  {lang === "th"
                    ? `ผ่านช่วงสัปดาห์แรกแล้ว (${plan.firstWeekHoldDoses > 0 ? `งดยา ${plan.firstWeekHoldDoses} วันแรก เริ่ม${getDayLabel(plan.clinicDay, "th")}` : "ไม่มีงดยา"} — ใช้ตารางปกติต่อไปนี้)`
                    : `First week completed (${plan.firstWeekHoldDoses > 0 ? `${plan.firstWeekHoldDoses} hold day(s) starting ${getDayLabel(plan.clinicDay, "en")}` : "no holds"} — follow regular schedule below)`}
                </strong>
              </div>
            </div>
            <ScheduleView
              title={t[lang].maintenanceWeekTitle}
              subtitle={t[lang].maintenanceWeekSubtitle}
              schedule={plan.maintenanceWeek}
              lang={lang}
              isCurrent={true}
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
              isCurrent={true}
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
