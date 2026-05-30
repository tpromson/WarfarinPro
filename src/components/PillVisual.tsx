import type { DayDose } from "../types";

export default function PillVisual({ combo, hold, lang = "th" }: { combo: DayDose["combo"]; hold?: boolean; lang?: "th" | "en" }) {
  if (hold || combo.dose === 0) return <span className="hold-pill">{lang === "th" ? "งดทานยา" : "HOLD"}</span>;
  const pills = [
    ...Array.from({ length: combo.orangeWhole }, (_, index) => <span key={`ow-${index}`} className="pill orange">2</span>),
    ...Array.from({ length: combo.orangeHalf }, (_, index) => <span key={`oh-${index}`} className="pill orange half">1/2</span>),
    ...Array.from({ length: combo.blueWhole }, (_, index) => <span key={`bw-${index}`} className="pill blue">3</span>),
    ...Array.from({ length: combo.blueHalf }, (_, index) => <span key={`bh-${index}`} className="pill blue half">1/2</span>),
  ];
  return <span className="pills">{pills}</span>;
}
