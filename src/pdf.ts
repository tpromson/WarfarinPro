export async function downloadPdf(filename: string) {
  const sheet = (document.querySelector(".sheet.layout-half-a4") || document.querySelector(".sheet.layout-label")) as HTMLElement | null;
  if (!sheet) return;

  const isLabel = sheet.classList.contains("layout-label");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Popup blocked. Please allow popups for PDF download.");
    return;
  }

  const styleTags = document.querySelectorAll("style");
  let cssText = "";
  styleTags.forEach((s) => {
    cssText += s.innerHTML + "\n";
  });

  const customPageStyle = isLabel
    ? `@page { size: 90mm 80mm !important; margin: 0 !important; }
       * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
       html, body { margin: 0 !important; padding: 0 !important; background: white !important; width: 90mm !important; height: 80mm !important; }
       body { display: flex !important; }
       .sheet.layout-label { width: 90mm !important; max-width: 90mm !important; min-height: 80mm !important; border: none !important; border-radius: 0 !important; padding: 2mm !important; box-shadow: none !important; margin: 0 !important; page-break-inside: avoid !important; }`
    : `@page { size: A5 landscape !important; margin: 0 !important; }
       * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
       html, body { margin: 0 !important; padding: 0 !important; background: white !important; width: 210mm !important; height: 148mm !important; }
       body { display: flex !important; }
       .layout-half-a4 { width: 210mm !important; height: 148mm !important; padding: 5mm !important; margin: 0 !important; border: none !important; box-shadow: none !important; border-radius: 0 !important; max-width: none !important; }
       .print-sheet-wrapper { position: static !important; width: auto !important; height: auto !important; overflow: visible !important; left: auto !important; top: auto !important; }`;

  printWindow.document.write(`<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${filename}</title>
<style>
${cssText}
${customPageStyle}
</style>
</head>
<body>
${sheet.outerHTML}
<script>
window.onload = function () { setTimeout(function () { window.print(); setTimeout(function () { window.close(); }, 500); }, 500); };
<\/script>
</body>
</html>`);
  printWindow.document.close();
}
