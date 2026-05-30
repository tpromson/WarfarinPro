import { AlertTriangle, BookOpen } from "lucide-react";
import Panel from "./Panel";
import BookletAndSharePanelContent from "./BookletAndSharePanelContent";
import type { MedicationPlan } from "../types";

export default function BookletAndSharePanel({
  plan,
  canShare,
  scheduleDelta,
  onOpenPatient,
  lang,
  highlighted,
  printLayout,
  setPrintLayout,
}: {
  plan: MedicationPlan;
  canShare: boolean;
  scheduleDelta: number;
  onOpenPatient: (plan: MedicationPlan) => void;
  lang: "th" | "en";
  highlighted: boolean;
  printLayout: "half-a4" | "label";
  setPrintLayout: (layout: "half-a4" | "label") => void;
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
        idPrefix="inline-"
        printLayout={printLayout}
        setPrintLayout={setPrintLayout}
      />
    </Panel>
  );
}
