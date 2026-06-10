import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  BookOpen,
  Check,
  Copy,
  FileDown,
  MessageCircle,
  Printer,
  QrCode,
  UserRound,
} from "lucide-react";
import { buildPatientUrl, days } from "../clinical";
import { getDayLabel, getPillComboDesc, t } from "../i18n";
import { generateMedicationSheetPdf } from "../pdf";
import { generateZpl } from "../zpl";
import IconButton from "./IconButton";
import PillVisual from "./PillVisual";
import type { MedicationPlan } from "../types";

export default function BookletAndSharePanelContent({
  plan,
  onOpenPatient,
  lang,
  idPrefix = "",
  printLayout,
  setPrintLayout,
}: {
  plan: MedicationPlan;
  onOpenPatient: (plan: MedicationPlan) => void;
  lang: "th" | "en";
  idPrefix?: string;
  printLayout: "half-a4" | "label";
  setPrintLayout: (layout: "half-a4" | "label") => void;
}) {
  const [qr, setQr] = useState("");
  const [qrError, setQrError] = useState(false);
  const [copiedWCode, setCopiedWCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dispenseWeeks, setDispenseWeeks] = useState(4);
  const [isCustomWeeks, setIsCustomWeeks] = useState(false);
  const [customWeeksInput, setCustomWeeksInput] = useState("4");
  const url = useMemo(() => buildPatientUrl(plan), [plan]);

  async function printZpl() {
    const zpl = generateZpl(plan, url);
    // Zebra Browser Print SDK must be installed on the user's machine.
    // It exposes window.BrowserPrint. If not available, fall back to download.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const BP = (window as any).BrowserPrint;
    if (BP) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      BP.getDefaultDevice("printer", (device: any) => {
        device.send(zpl, undefined, (err: string) => {
          if (err) alert(`Zebra print error: ${err}`);
        });
      });
    } else {
      // Fallback: download .zpl file so user can send manually
      const blob = new Blob([zpl], { type: "text/plain" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `warfarin-${plan.wCode}.zpl`;
      a.click();
    }
  }

  const pillSums = useMemo(() => {
    let w1OrangeWhole = 0;
    let w1OrangeHalf = 0;
    let w1BlueWhole = 0;
    let w1BlueHalf = 0;

    plan.firstWeek.forEach((d) => {
      w1OrangeWhole += d.combo.orangeWhole || 0;
      w1OrangeHalf += d.combo.orangeHalf || 0;
      w1BlueWhole += d.combo.blueWhole || 0;
      w1BlueHalf += d.combo.blueHalf || 0;
    });

    let maintOrangeWhole = 0;
    let maintOrangeHalf = 0;
    let maintBlueWhole = 0;
    let maintBlueHalf = 0;

    plan.maintenanceWeek.forEach((d) => {
      maintOrangeWhole += d.combo.orangeWhole || 0;
      maintOrangeHalf += d.combo.orangeHalf || 0;
      maintBlueWhole += d.combo.blueWhole || 0;
      maintBlueHalf += d.combo.blueHalf || 0;
    });

    const multiplier = Math.max(0, dispenseWeeks - 1);

    const totalOrangeWhole = w1OrangeWhole + maintOrangeWhole * multiplier;
    const totalOrangeHalf = w1OrangeHalf + maintOrangeHalf * multiplier;
    const totalBlueWhole = w1BlueWhole + maintBlueWhole * multiplier;
    const totalBlueHalf = w1BlueHalf + maintBlueHalf * multiplier;

    const dispenseOrange = totalOrangeWhole + Math.ceil(totalOrangeHalf / 2);
    const dispenseBlue = totalBlueWhole + Math.ceil(totalBlueHalf / 2);

    return {
      orangeWhole: totalOrangeWhole,
      orangeHalf: totalOrangeHalf,
      dispenseOrange,
      blueWhole: totalBlueWhole,
      blueHalf: totalBlueHalf,
      dispenseBlue,
    };
  }, [plan, dispenseWeeks]);

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
    setQr("");
    setQrError(false);
    QRCode.toDataURL(url, { errorCorrectionLevel: "Q", margin: 3, width: 300 })
      .then(setQr)
      .catch((err) => {
        console.error("QR Code Error in BookletAndSharePanelContent:", err);
        setQrError(true);
      });
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
    <div className="grid gap-6 md:grid-cols-[300px_1fr]">
      {/* Left Column: W-Code, QR Code & Links */}
      <div className="space-y-5 border-b border-clinic-line md:border-b-0 md:border-r border-dashed border-clinic-line pb-6 md:pb-0 md:pr-6 flex flex-col justify-between">
        <div className="space-y-4">
          {/* W-Code Ticket */}
          <div className="bg-clinic-paper border-2 border-dashed border-clinic-blue/40 rounded-xl p-4 text-center space-y-2.5 relative overflow-hidden shadow-sm">
            <div className="text-[11px] uppercase font-bold text-clinic-blue tracking-wider">
              {lang === "th" ? "รหัส W-code สำหรับสมุดยา" : "Warfarin W-Code"}
            </div>
            <div className="text-3xl font-black text-clinic-ink tracking-widest font-mono select-all bg-white py-2 px-4 rounded-lg shadow-sm border border-clinic-line inline-block">
              {plan.wCode}
            </div>
            <div className="text-[11px] font-bold text-clinic-blue leading-normal bg-clinic-cyan/35 py-1.5 px-2 rounded-md border border-clinic-cyan/70 select-none">
              {lang === "th"
                ? `ปริมาณรวมต่อสัปดาห์: ${plan.scheduleWeeklyDose.toFixed(1)} มก. | งดยาในสัปดาห์แรก: ${plan.firstWeekHoldDoses} วัน`
                : `Weekly Dose: ${plan.scheduleWeeklyDose.toFixed(1)} mg | Hold: ${plan.firstWeekHoldDoses} day(s)`}
            </div>
            <p className="text-[10px] text-slate-500 leading-normal">
              {lang === "th"
                ? "คัดลอกรหัสนี้เขียนลงสมุดคุมยาวาร์ฟาริน หรือให้คนไข้นำไปพิมพ์เปิดตารางยาได้"
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

        {/* Action Buttons */}
        <div className="space-y-3">

          {/* Group 1: ส่งให้ผู้ป่วย */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {lang === "th" ? "ส่งให้ผู้ป่วย" : "Share with Patient"}
            </span>
            <button
              id={`${idPrefix}btn-open-patient`}
              onClick={() => onOpenPatient(plan)}
              className="w-full py-2.5 bg-clinic-blue hover:bg-clinic-blue/90 text-white font-extrabold text-sm rounded-xl shadow transition-all focus:outline-none flex items-center justify-center gap-2"
            >
              <UserRound size={16} />
              {lang === "th" ? "เปิดหน้าผู้ป่วย" : "Patient View"}
            </button>
            <div className="grid grid-cols-2 gap-1.5">
              <IconButton
                id={`${idPrefix}btn-copy-link`}
                icon={<Copy size={14} />}
                onClick={handleCopyLink}
                label={copiedLink ? (lang === "th" ? "คัดลอกแล้ว!" : "Copied!") : (lang === "th" ? "คัดลอกลิงก์" : "Copy Link")}
                shortcut="Alt+C"
              />
              <button
                onClick={() =>
                  window.open(`https://line.me/R/msg/text/?${encodeURIComponent(lineText)}`, "_blank")
                }
                className="w-full py-1.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-lg transition-colors focus:outline-none flex items-center justify-center gap-1.5 shadow-sm"
              >
                <MessageCircle size={14} className="text-[#06C755]" />
                <span>LINE Share</span>
              </button>
            </div>
          </div>

          {/* Group 2: พิมพ์ */}
          <div className="space-y-1.5 print:hidden">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              {lang === "th" ? "พิมพ์เอกสาร" : "Print / Export"}
            </span>
            <div className="segmented !h-[36px] !min-h-[36px] !grid-cols-2">
              <button
                type="button"
                className={`!min-h-[28px] !text-[11px] !py-0 !px-2 ${printLayout === "half-a4" ? "active" : ""}`}
                onClick={() => setPrintLayout("half-a4")}
              >
                {t[lang].printHalfA4}
              </button>
              <button
                type="button"
                className={`!min-h-[28px] !text-[11px] !py-0 !px-2 ${printLayout === "label" ? "active" : ""}`}
                onClick={() => setPrintLayout("label")}
              >
                {t[lang].printLabel}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <IconButton
                icon={<FileDown size={14} />}
                onClick={() => generateMedicationSheetPdf(plan, qr, lang, `warfarin-${plan.wCode}.pdf`)}
                label={t[lang].downloadPdf}
                disabled={!qr || qrError}
              />
              {printLayout === "label" ? (
                <IconButton
                  icon={<Printer size={14} />}
                  onClick={printZpl}
                  label={lang === "th" ? "พิมพ์ Zebra" : "Print Zebra"}
                />
              ) : (
                <IconButton
                  icon={<Printer size={14} />}
                  onClick={() => window.print()}
                  label={lang === "th" ? "พิมพ์ใบยา" : "Print Leaflet"}
                  shortcut="Alt+H"
                />
              )}
            </div>
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
                {lang === "th"
                  ? "ข้อมูลวิธีกรอกลงสมุดประวัติยาของผู้ป่วย"
                  : "Warfarin Booklet Writing Guide"}
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
                      ? `งดยา ${plan.firstWeekHoldDoses} วันแรก (เริ่มงดวัน${getDayLabel(plan.clinicDay, "th")} เป็นต้นไป) จากนั้นทานขนาดปกติตามตารางในวันที่เหลือ`
                      : `Hold drug for the first ${plan.firstWeekHoldDoses} days (starting on ${getDayLabel(plan.clinicDay, "en")}), then take the regular dose on remaining days.`}
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
              <table className="w-full text-xs text-left border-collapse min-w-0 md:min-w-[400px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-clinic-line font-bold">
                    <th className="p-2.5 w-28">{lang === "th" ? "วัน" : "Day"}</th>
                    <th className="p-2.5 text-center w-24">{lang === "th" ? "ขนาดโดส" : "Dose"}</th>
                    <th className="p-2.5 text-center">
                      {lang === "th" ? "ตัวช่วยจำสีเม็ดยา" : "Pill Visual"}
                    </th>
                    <th className="p-2.5 text-right w-44">
                      {lang === "th" ? "วิธีเขียนลงสมุดยา" : "Transcription Text"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((dayKey) => {
                    const dayDose = plan.maintenanceWeek.find((d) => d.day === dayKey);
                    if (!dayDose) return null;
                    return (
                      <tr
                        key={dayKey}
                        className="border-b border-clinic-line/30 hover:bg-slate-50/50"
                      >
                        <td className="p-2.5 font-bold text-clinic-ink">
                          {getDayLabel(dayKey, lang)}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-800">
                          {dayDose.hold ? (
                            <span className="text-clinic-red">
                              {lang === "th" ? "งดทานยา" : "HOLD"}
                            </span>
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

          {/* Step 3: Pharmacist Dispensing Calculator */}
          <div className="space-y-2.5 pt-3.5 border-t border-clinic-line/60 border-dashed">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-slate-500 block font-bold">
                {lang === "th"
                  ? `3. จำนวนเม็ดยารวมสำหรับจ่ายยา (สำหรับเภสัชกร) - ${dispenseWeeks} สัปดาห์ (${dispenseWeeks * 7} วัน)`
                  : `3. Total Tablets for Dispensing (Pharmacist Calculator) - ${dispenseWeeks} Weeks (${dispenseWeeks * 7} Days)`}
              </span>

              <div className="flex items-center gap-1 text-[11px] border border-clinic-line/80 rounded-lg p-0.5 bg-white shadow-sm">
                {[4, 8, 12].map((w) => (
                  <button
                    key={w}
                    type="button"
                    className={`px-2 py-0.5 rounded-md font-bold transition-all focus:outline-none ${
                      dispenseWeeks === w && !isCustomWeeks
                        ? "bg-clinic-blue text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                    onClick={() => {
                      setDispenseWeeks(w);
                      setIsCustomWeeks(false);
                      setCustomWeeksInput(w.toString());
                    }}
                  >
                    {w} {lang === "th" ? "สัปดาห์" : "W"}
                  </button>
                ))}
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-md font-bold transition-all focus:outline-none ${
                    isCustomWeeks
                      ? "bg-clinic-blue text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                  onClick={() => {
                    setIsCustomWeeks(true);
                    const val = parseInt(customWeeksInput, 10);
                    if (!isNaN(val) && val > 0) {
                      setDispenseWeeks(val);
                    }
                  }}
                >
                  {lang === "th" ? "กำหนดเอง" : "Custom"}
                </button>

                {isCustomWeeks && (
                  <input
                    type="number"
                    min="1"
                    max="52"
                    className="w-10 px-1 py-0.5 text-center border border-slate-200 rounded focus:outline-none focus:border-clinic-blue font-bold text-slate-800 bg-slate-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={customWeeksInput}
                    onChange={(e) => {
                      setCustomWeeksInput(e.target.value);
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val > 0) {
                        setDispenseWeeks(val);
                      }
                    }}
                    onBlur={() => {
                      const val = parseInt(customWeeksInput, 10);
                      if (isNaN(val) || val <= 0) {
                        setCustomWeeksInput("4");
                        setDispenseWeeks(4);
                        setIsCustomWeeks(false);
                      }
                    }}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {/* Orange 2mg Card */}
              <div className="bg-orange-50/50 border border-orange-100/70 rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-orange-500/5 rounded-bl-full flex items-center justify-end pr-2 pb-2">
                  <span className="pill orange !min-w-[18px] !h-4.5 !w-4.5 !text-[8px] !leading-none shadow-sm select-none">
                    2
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-orange-700">
                    {lang === "th" ? "เม็ดสีส้ม 2 mg" : "Orange 2 mg"}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-orange-950 font-mono">
                      {pillSums.dispenseOrange}
                    </span>
                    <span className="text-[10px] text-orange-800 font-bold">
                      {lang === "th" ? "เม็ดเต็ม" : "tabs"}
                    </span>
                  </div>
                </div>
                <p className="text-[9px] text-orange-850 mt-1.5 border-t border-orange-100/60 pt-1 font-bold leading-normal">
                  {lang === "th"
                    ? `รายละเอียด: เม็ดเต็ม ${pillSums.orangeWhole} + แบบครึ่ง ${pillSums.orangeHalf} ชิ้น`
                    : `Breakdown: ${pillSums.orangeWhole} whole + ${pillSums.orangeHalf} half`}
                </p>
              </div>

              {/* Blue 3mg Card */}
              <div className="bg-blue-50/50 border border-blue-100/70 rounded-xl p-3 flex flex-col justify-between shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 h-10 w-10 bg-blue-500/5 rounded-bl-full flex items-center justify-end pr-2 pb-2">
                  <span className="pill blue !min-w-[18px] !h-4.5 !w-4.5 !text-[8px] !leading-none shadow-sm select-none">
                    3
                  </span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] font-black uppercase tracking-wider text-blue-700">
                    {lang === "th" ? "เม็ดสีฟ้า 3 mg" : "Blue 3 mg"}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black text-blue-950 font-mono">
                      {pillSums.dispenseBlue}
                    </span>
                    <span className="text-[10px] text-blue-850 font-bold">
                      {lang === "th" ? "เม็ดเต็ม" : "tabs"}
                    </span>
                  </div>
                </div>
                <p className="text-[9px] text-blue-850 mt-1.5 border-t border-blue-100/60 pt-1 font-bold leading-normal">
                  {lang === "th"
                    ? `รายละเอียด: เม็ดเต็ม ${pillSums.blueWhole} + แบบครึ่ง ${pillSums.blueHalf} ชิ้น`
                    : `Breakdown: ${pillSums.blueWhole} whole + ${pillSums.blueHalf} half`}
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
