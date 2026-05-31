import React, { createElement } from "react";
import { createRoot, Root } from "react-dom/client";
import type { MedicationPlan } from "./types";
import MedicationSheet from "./components/MedicationSheet";

export async function generateMedicationSheetPdf(
  plan: MedicationPlan,
  _qrDataUrl: string,
  lang: "th" | "en",
  filename: string
): Promise<void> {
  const html2canvas = (await import("html2canvas")).default;
  const { default: JsPDF } = await import("jspdf");

  const container = document.createElement("div");
  container.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;z-index:-1;pointer-events:none;font-family:'Inter','Noto Sans Thai',sans-serif;background:white;overflow:hidden;";
  document.body.appendChild(container);

  const root: Root = createRoot(container);

  await new Promise<void>((resolve) => {
    root.render(
      createElement(MedicationSheet, { plan, lang, printLayout: "half-a4" })
    );
    setTimeout(resolve, 100);
  });

  await document.fonts.ready;

  await new Promise<void>((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      const el = container.querySelector(".sheet");
      const qr = el?.querySelector("img");
      const rows = container.querySelectorAll(".day-row");
      if ((el && qr && rows.length >= 7) || attempts > 50) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  await new Promise((r) => setTimeout(r, 300));

  const element = container.querySelector(".sheet") as HTMLElement;
  if (!element) {
    root.unmount();
    document.body.removeChild(container);
    throw new Error("Could not find medication sheet element");
  }

  element.style.width = "";
  const renderedW = element.offsetWidth || 794;
  element.style.width = `${renderedW}px`;

  const canvas = await html2canvas(element, {
    scale: 5,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
    width: renderedW,
  });

  root.unmount();
  document.body.removeChild(container);

  const imgData = canvas.toDataURL("image/png");

  const portraitA5W = 148;
  const portraitA5H = 210;
  const imgAspect = canvas.height / canvas.width;
  const fitW = portraitA5W;
  const fitH = fitW * imgAspect;

  const pdf = new JsPDF({ orientation: "portrait", unit: "mm", format: "a5" });

  const offsetY = (portraitA5H - Math.min(fitH, portraitA5H)) / 2;
  pdf.addImage(imgData, "PNG", 0, offsetY, fitW, Math.min(fitH, portraitA5H));
  pdf.save(filename);
}
