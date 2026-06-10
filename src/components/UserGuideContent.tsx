import { AlertTriangle, BookOpen, HeartPulse, Keyboard, Smartphone, Undo } from "lucide-react";

export default function UserGuideContent({ lang }: { lang: "th" | "en" }) {
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modLabel = isMac ? "Ctrl / ⌥" : "Alt";

  if (lang === "th") {
    return (
      <div className="space-y-8 text-clinic-ink">
        {/* Intro Section */}
        <section className="bg-slate-50 border border-clinic-line rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-clinic-blue">
            <BookOpen size={22} className="stroke-[2.5]" />
            <h2 className="text-xl font-black">บทนำเกี่ยวกับ WarfarinPro</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            ระบบ <strong>WarfarinPro</strong>{" "}
            ออกแบบมาเพื่อเป็นเครื่องมือสนับสนุนการตัดสินใจทางคลินิก (Clinical Decision Support)
            ในการดูแลผู้ป่วยคุมยาวาร์ฟาริน
            โดยช่วยให้แพทย์และเภสัชกรคำนวณและวางตารางการทานยาได้ถูกต้อง รวดเร็ว
            ปราศจากความคลาดเคลื่อนทางคณิตศาสตร์
            และแปลงเป็นรูปแบบกราฟิกสีเม็ดยาจำลองที่คนไข้สูงอายุหรือผู้ดูแลสามารถนำไปทานได้อย่างปลอดภัยสูงสุด
          </p>
          <div className="bg-red-50 border border-red-200 text-clinic-red p-3.5 rounded-lg flex gap-3 text-xs">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-1">ข้อพึงระวังและความรับผิดชอบทางคลินิก</strong>
              ระบบนี้เป็นเพียงเครื่องมือสนับสนุนการคำนวณเท่านั้น
              การสั่งการรักษาและการประเมินทางคลินิกขึ้นอยู่กับวิจารณญาณของแพทย์และเภสัชกรผู้ประเมินเป็นหลัก
            </div>
          </div>
        </section>

        {/* Clinician Workspace */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <HeartPulse size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">1. สำหรับบุคลากรทางการแพทย์ (Clinician Workspace)</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue">
                การกรอกข้อมูลและ Target Presets
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                กรอกผลการตรวจ <strong>Current INR</strong>, ขนาดยาเดิม{" "}
                <strong>Previous weekly dose (mg)</strong> และเลือกวันมานัดตรวจคลินิก
                เพื่อกำหนดระยะเวลางดยาชั่วคราวในสัปดาห์แรก (First Week Hold)
                โดยระบบจะคำนวณสัดส่วนการปรับยาที่เหมาะสมให้อัตโนมัติ ตามค่า Target range ที่กำหนด
              </p>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue">
                ระดับแจ้งเตือน (Safety Banners)
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                แถบสีด้านบนสุดแสดงสถานะความปลอดภัย: สีเขียว (ปกติ), สีส้ม (ควรระวัง
                ปรับขนาดยาเล็กน้อย), สีแดง (อันตราย INR สูง แนะนำแนวทางแก้ไข), และสีแดงเข้ม (Hard
                Stop - เกิดภาวะเลือดออกรุนแรง หรือกำลังตั้งครรภ์
                ระบบจะปิดปุ่มแชร์และสั่งงดยาเข้ารักษาฉุกเฉิน)
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="border border-clinic-line rounded-xl bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-clinic-line p-3 flex items-center gap-2">
              <Keyboard size={16} className="text-slate-500" />
              <strong className="text-xs font-black uppercase tracking-wider text-slate-600">
                คีย์ลัดสำหรับกรอกข้อมูลรวดเร็ว (Keyboard Shortcuts)
              </strong>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-clinic-line text-slate-500 font-bold">
                    <th className="p-3">คีย์ลัด</th>
                    <th className="p-3">ช่องข้อมูลที่โฟกัส / คำสั่งการทำงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + I</td>
                    <td className="p-3">กรอกผลตรวจ INR ปัจจุบัน (Current INR)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + P</td>
                    <td className="p-3">กรอกขนาดยาเดิมรวมต่อสัปดาห์ (Previous weekly dose)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + T</td>
                    <td className="p-3">เปิดสลับช่วงเป้าหมายการรักษา (Target Range)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + V</td>
                    <td className="p-3">เลือกวันเข้าตรวจนัดปัจจุบัน (Clinic visit day)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + B</td>
                    <td className="p-3">สลับเปิด/ปิดติ๊กประวัติเลือดออกรุนแรง (Major Bleeding)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + D</td>
                    <td className="p-3">เลือกปรับขนาดยา (%) หรือสัปดาห์แรก</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + F</td>
                    <td className="p-3">เลือกจำนวนวันงดยาในสัปดาห์แรก (Hold Doses)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + S</td>
                    <td className="p-3">เปิดกล่องสรุปสมุดบันทึกยา (Booklet Summary Modal)</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + C</td>
                    <td className="p-3">คัดลอกลิงก์คนไข้ (Patient Link) ส่งต่อได้ทันที</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + H</td>
                    <td className="p-3">สั่งพิมพ์แผ่นตารางยาหรือฉลากยาออกเครื่องพิมพ์</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-500">Enter / Shift+Enter</td>
                    <td className="p-3">
                      เคลื่อนย้ายโฟกัสลง / โฟกัสขึ้นตามลำดับช่องกรอกข้อมูลและปฏิทิน
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reset button description */}
          <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-clinic-red">
              <Undo size={16} />
              <strong className="text-sm font-extrabold">
                การปรับตารางแมนนวลและการกู้คืนค่าคำนวณ (Manual & Reset)
              </strong>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              แพทย์สามารถแก้ไขขนาดยาแต่ละวันได้อิสระผ่านช่องเมนูเลือกในตาราง
              และหากตารางยาคลาดเคลื่อนจากการคำนวณเดิม ระบบจะแสดงปุ่ม{" "}
              <strong>"Reset to Suggestion"</strong>
              (ไอคอนหมุนกลับสีแดง) ข้างปุ่มสลับตารางวันคู่/คี่
              ซึ่งสามารถกดคลิกเดียวเพื่อล้างค่าปรับแมนนวลทั้งหมด
              และย้อนกลับไปใช้ตารางคำนวณเริ่มต้นจากระบบได้ทันที
            </p>
          </div>
        </section>

        {/* Understanding W-Code */}
        <section className="border border-clinic-line rounded-xl p-5 bg-slate-50 space-y-3">
          <div className="flex items-center gap-2 text-clinic-ink">
            <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-700">
              การตีความรหัสสรุป W-code
            </h3>
          </div>
          <p className="text-xs text-slate-655 leading-relaxed">
            รหัส **W-code** (เช่น{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">
              W120-2H
            </code>
            ) เป็นรหัสสรุปการจ่ายยาวาร์ฟารินที่กระทัดรัดสำหรับจดลงสมุดคนไข้:
          </p>
          <div className="grid gap-3 md:grid-cols-2 text-xs">
            <div className="p-3 bg-white rounded-lg border border-clinic-line/60">
              <span className="block font-black text-clinic-blue mb-0.5">
                ส่วนแรก (ขนาดยาสัปดาห์)
              </span>
              <strong>W120</strong> คือขนาดยารวมสัปดาห์คูณ 10 (เท่ากับคนไข้ทานยารวมสัปดาห์ละ{" "}
              <strong>12.0 มก.</strong>)
            </div>
            <div className="p-3 bg-white rounded-lg border border-clinic-line/60">
              <span className="block font-black text-clinic-blue mb-0.5">
                ส่วนหลัง (วันงดยาเริ่มต้น)
              </span>
              <strong>2H</strong> คือจำนวนวันที่ต้องงดยา (Hold) ทันทีในช่วง 2 วันแรกของสัปดาห์แรก
            </div>
          </div>
        </section>

        {/* Patient Viewer */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <Smartphone size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">2. สำหรับผู้ป่วยและผู้ดูแล (Patient Viewer)</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            ผู้ป่วยหรือผู้ดูแลสามารถเข้าหน้านี้โดยการสแกน QR Code หรือเปิดลิงก์ที่ถูกสร้างโดยแพทย์
            เพื่อเป็นคู่มือกำกับการกินยารายสัปดาห์
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 text-clinic-blue">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-cyan/40 text-xs font-black">
                  1
                </span>
                <strong className="text-sm font-extrabold">ภาพเม็ดยาแบบแยกสีชัดเจน</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                เม็ดยาแบ่งรหัสสี (ส้ม = 2 มก., ฟ้า = 3 มก., แถบแดง = งดยา)
                พร้อมแสดงตัวเลขขนาดและขีดแยกซีกยาโปร่งแสง (ครึ่งเม็ด)
                เพื่อความปลอดภัยสูงสุดของผู้มีสายตาเลือนรางหรือตาบอดสี
              </p>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 text-clinic-blue">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-cyan/40 text-xs font-black">
                  2
                </span>
                <strong className="text-sm font-extrabold">ตาราง 2 รูปแบบ</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                มีปฏิทินยาสองแบบให้สลับดู: <strong>สัปดาห์แรก (First Week)</strong>{" "}
                แสดงตารางเริ่มนับจากวันตรวจปัจจุบัน (มีวันงดยาร่วมด้วย) และ{" "}
                <strong>ระยะยาวปกติ (Maintenance Week)</strong>{" "}
                แสดงตารางรายสัปดาห์วนซ้ำสำหรับกินรอบถัดไป
              </p>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 text-clinic-blue">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-cyan/40 text-xs font-black">
                  3
                </span>
                <strong className="text-sm font-extrabold">เสียงอ่านคู่มือและดูออฟไลน์</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                สามารถคลิกปุ่มเสียงเพื่อเปิดฟังเสียงสังเคราะห์ภาษาไทยอ่านวิธีกินยาประจำวันได้
                และผู้ใช้สามารถเซฟตารางยาลงสมาร์ตโฟน (Save Plan)
                เพื่อหยิบมาเปิดทบทวนวิธีกินยาออฟไลน์ได้โดยไม่ต้องเปิดเน็ต
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  } else {
    return (
      <div className="space-y-8 text-clinic-ink">
        {/* Intro Section */}
        <section className="bg-slate-50 border border-clinic-line rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2.5 text-clinic-blue">
            <BookOpen size={22} className="stroke-[2.5]" />
            <h2 className="text-xl font-black">Introduction to WarfarinPro</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            <strong>WarfarinPro</strong> is designed as a Clinical Decision Support system for
            managing warfarin dosing plans. It assists clinicians in calculating accurate weekly
            doses, avoiding mathematical errors, and translating these complex schedules into
            intuitive, color-coded daily dosing instructions for patients and their caregivers.
          </p>
          <div className="bg-red-50 border border-red-200 text-clinic-red p-3.5 rounded-lg flex gap-3 text-xs">
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-1">Clinical Responsibility & Disclaimer</strong>
              This application is a decision support tool only. It does not replace autonomous
              clinical prescribing or assessment. The final prescribing choice remains the sole
              responsibility of the treating clinician.
            </div>
          </div>
        </section>

        {/* Clinician Workspace */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <HeartPulse size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">1. Clinician Workspace Guide</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue">
                Clinical Inputs & Target Presets
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                Enter the patient's <strong>Current INR</strong>, their{" "}
                <strong>Previous weekly dose (mg)</strong>, and select the current clinic visit day.
                Define their therapeutic targets using standard 2.0-3.0, mechanical valve 2.5-3.5,
                or customizable custom ranges.
              </p>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue">
                Safety Banners & Classifications
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                The top-most status banner shows real-time safety categorization: green (Normal
                in-range), orange (Caution adjustment needed), red (Danger alert requiring specific
                hold guidelines), and dark red (Hard Stop blocking routine dosing due to major
                bleeding or pregnancy).
              </p>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="border border-clinic-line rounded-xl bg-white overflow-hidden shadow-sm">
            <div className="bg-slate-50 border-b border-clinic-line p-3 flex items-center gap-2">
              <Keyboard size={16} className="text-slate-500" />
              <strong className="text-xs font-black uppercase tracking-wider text-slate-600">
                Keyboard Shortcuts Reference
              </strong>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-clinic-line text-slate-500 font-bold">
                    <th className="p-3">Shortcut</th>
                    <th className="p-3">Action Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + I</td>
                    <td className="p-3">Focus the Current INR input field</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + P</td>
                    <td className="p-3">Focus the Previous weekly dose input field</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + T</td>
                    <td className="p-3">Toggle and select target INR presets</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + V</td>
                    <td className="p-3">Select the clinic check-in visit day</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + B</td>
                    <td className="p-3">Toggle the Major Bleeding safety checkbox</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + D</td>
                    <td className="p-3">Select selected dose adjustment percent</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + F</td>
                    <td className="p-3">Select hold doses count for the first week</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + S</td>
                    <td className="p-3">Open the Booklet transcription summary popup dialog</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + C</td>
                    <td className="p-3">Copy the patient share URL directly to clipboard</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-clinic-blue">{modLabel} + H</td>
                    <td className="p-3">Open printer settings to print sheets or labels</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-500">Enter / Shift+Enter</td>
                    <td className="p-3">
                      Move focus downward / upward through forms and schedules
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Reset button description */}
          <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
            <div className="flex items-center gap-1.5 text-clinic-red">
              <Undo size={16} />
              <strong className="text-sm font-extrabold">Manual Overrides and Reset Button</strong>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Clinicians can freely adjust daily dosing values inside the maintenance grid. If
              modifications lead to errors or deviations, a red{" "}
              <strong>"Reset to Suggestion"</strong> (Undo icon) button appears next to the
              alternating day presets, allowing a single-click rollback to restore the default
              calculation.
            </p>
          </div>
        </section>

        {/* Understanding W-Code */}
        <section className="border border-clinic-line rounded-xl p-5 bg-slate-50 space-y-3">
          <div className="flex items-center gap-2 text-clinic-ink">
            <h3 className="text-base font-extrabold uppercase tracking-wide text-slate-700">
              Understanding W-Code Format
            </h3>
          </div>
          <p className="text-xs text-slate-655 leading-relaxed">
            The **W-code** (e.g.,{" "}
            <code className="bg-white px-1.5 py-0.5 rounded border font-mono font-bold">
              W120-2H
            </code>
            ) is a compact string representing the final plan summary for medical record booklets:
          </p>
          <div className="grid gap-3 md:grid-cols-2 text-xs">
            <div className="p-3 bg-white rounded-lg border border-clinic-line/60">
              <span className="block font-black text-clinic-blue mb-0.5">
                First Part (Weekly Dose)
              </span>
              <strong>W120</strong> represents the weekly dose multiplied by 10 (equals cumulative{" "}
              <strong>12.0 mg</strong>).
            </div>
            <div className="p-3 bg-white rounded-lg border border-clinic-line/60">
              <span className="block font-black text-clinic-blue mb-0.5">
                Second Part (First Week Hold)
              </span>
              <strong>2H</strong> signifies that <strong>2 hold doses</strong> must be administered
              on visit days in the first week.
            </div>
          </div>
        </section>

        {/* Patient Viewer */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <Smartphone size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">2. Patient Viewer Guide</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            Patients access this screen by scanning the generated QR code or opening the clinical
            dosing web link on their smartphone.
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 text-clinic-blue">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-cyan/40 text-xs font-black">
                  1
                </span>
                <strong className="text-sm font-extrabold">Color Double-Encoding</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pills are represented by clear sizing and color-coding (Orange = 2 mg, Blue = 3 mg,
                Red bar = Hold) with large numbers and split shading dividers for colorblind or
                visually impaired safety.
              </p>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 text-clinic-blue">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-cyan/40 text-xs font-black">
                  2
                </span>
                <strong className="text-sm font-extrabold">Dual Calendars</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Check both <strong>First Week</strong> (temporary loading instructions beginning on
                clinic visit day) and <strong>Maintenance Week</strong> (long-term repeating
                schedule) calendars to ensure correct dosing.
              </p>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <div className="flex items-center gap-2 text-clinic-blue">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-clinic-cyan/40 text-xs font-black">
                  3
                </span>
                <strong className="text-sm font-extrabold">Voice Reading & Offline Access</strong>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Click read-aloud voice support for spoken guidance. Patients can save the plan
                locally (Save Plan) to view their schedule anytime at home even without cell signal
                or internet.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
