import { AlertTriangle, BookOpen, HeartPulse, Keyboard, Pin, Smartphone, Undo } from "lucide-react";

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

        {/* Visual Workflow Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <svg className="h-5 w-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <h3 className="text-lg font-bold">แผนผังขั้นตอนการทำงาน (Workflow Flowchart)</h3>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-7 items-center bg-white border border-clinic-line rounded-2xl p-5 shadow-sm">
            {/* Step 1 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">ขั้นตอนที่ 1</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-clinic-blue/10 text-clinic-blue mx-auto font-black text-sm">
                INR
              </div>
              <div className="text-xs font-black text-slate-850">กรอกข้อมูลคนไข้</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                ป้อนผลตรวจ INR ล่าสุด โดสยาเดิม และข้อควรระวัง
              </div>
            </div>

            {/* Arrow 1 */}
            <div className="md:col-span-1 text-center py-1 md:py-0 select-none">
              <span className="hidden md:inline text-clinic-blue text-xl font-bold">➜</span>
              <span className="inline md:hidden text-clinic-blue text-lg font-bold">⬇</span>
            </div>

            {/* Step 2 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">ขั้นตอนที่ 2</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 mx-auto font-black text-sm">
                AUTO
              </div>
              <div className="text-xs font-black text-slate-850">คำนวณโดสแนะแนว</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                ระบบคำนวณปรับลด/เพิ่ม เปอร์เซ็นต์ยาให้อัตโนมัติ
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="md:col-span-1 text-center py-1 md:py-0 select-none">
              <span className="hidden md:inline text-clinic-blue text-xl font-bold">➜</span>
              <span className="inline md:hidden text-clinic-blue text-lg font-bold">⬇</span>
            </div>

            {/* Step 3 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">ขั้นตอนที่ 3</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-orange-500/10 text-orange-600 mx-auto font-black text-sm">
                ENTER
              </div>
              <div className="text-xs font-black text-slate-850">ลื่นไหลด้วย Enter</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                กด Enter เปิด Booklet เลื่อนดูจำนวนเม็ดจ่าย และกดอีกทีเพื่อปิด
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="md:col-span-1 text-center py-1 md:py-0 select-none">
              <span className="hidden md:inline text-clinic-blue text-xl font-bold">➜</span>
              <span className="inline md:hidden text-clinic-blue text-lg font-bold">⬇</span>
            </div>

            {/* Step 4 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">ขั้นตอนที่ 4</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-600 mx-auto font-black text-sm">
                QR
              </div>
              <div className="text-xs font-black text-slate-850">สแกน/แชร์ส่งคนไข้</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                พิมพ์ฉลากยา/สแกน QR ดูตารางเม็ดยาจำลองบนมือถือ
              </div>
            </div>
          </div>
        </section>

        {/* Clinician Workspace */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <HeartPulse size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">1. สำหรับบุคลากรทางการแพทย์ (Clinician Workspace)</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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
                การตั้งค่าคลังยา (Tablet Stock)
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                กำหนดขนาดเม็ดยาที่มีพร้อมจ่ายในโรงพยาบาลได้ 2 แบบ: <strong>ขนาด 2, 3 mg</strong> หรือ <strong>ขนาด 2, 3, 5 mg</strong> (เม็ดสีชมพูเพิ่มเข้ามา) ช่วยลดจำนวนเม็ดยาลงสำหรับคนไข้ที่ทานขนาดยาสูง และช่วยให้การจัดการยาปลอดภัยยิ่งขึ้น
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
                    <th className="p-3">ช่องข้อมูลที่โฟกัส / คำสั่งการทำงาน / ลำดับคีย์ลัด</th>
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
                      <strong>(เมื่ออยู่นอกป๊อปอัป):</strong> เคลื่อนย้ายโฟกัสลง / โฟกัสขึ้นตามลำดับช่องข้อมูล (เมื่อกด Enter ที่ช่องหยุดยาตัวสุดท้าย จะเปิดป๊อปอัป Booklet สรุปยาให้อัตโนมัติ)
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-500">Enter (ใน Booklet Modal)</td>
                    <td className="p-3">
                      <strong>กดครั้งที่ 1:</strong> เลื่อน (Scroll) หน้าต่างลงไปล่างสุดโดยอัตโนมัติ เพื่อรีวิวสูตรยาและจำนวนเม็ดยาจ่าย <br />
                      <strong>กดครั้งที่ 2:</strong> ปิดหน้าต่างป๊อปอัปบันทึกยาทันที
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-500">Escape (Esc)</td>
                    <td className="p-3">ปิดหน้าต่างป๊อปอัปหรือแจ้งเตือนทุกรูปแบบทันที</td>
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

        {/* Always on Top Guide */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <Pin size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">3. การใช้งานเปิดคู่ขนานโปรแกรม HIS โรงพยาบาล (Always on Top)</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            กรณีที่ต้องการใช้งานหน้าคำนวณของ <strong>WarfarinPro</strong> ไปพร้อมๆ กับการป้อนข้อมูลลงโปรแกรมบันทึกเวชระเบียนโรงพยาบาล (HIS) ที่แสดงผลเต็มหน้าจอ เพื่อไม่ต้องสลับสลับหน้าต่างบ่อยๆ คุณสามารถล็อกหน้าต่างเว็บแอปให้อยู่หน้าสุดเสมอได้ด้วยโปรแกรมเครื่องมือเสริม ดังนี้:
          </p>

          {/* Visual Always on Top Flow */}
          <div className="bg-slate-50 border border-clinic-line/60 rounded-xl p-4 space-y-3">
            <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">ผังขั้นตอนการใช้งาน Always on Top</div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-5 items-center bg-white p-3 rounded-xl border border-clinic-line/40 shadow-sm max-w-2xl">
              <div className="text-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-extrabold text-clinic-blue">1. เปิดหน้าจอคู่กัน</div>
                <div className="text-[9px] text-slate-500 mt-0.5">เปิดเบราว์เซอร์คู่กับ HIS</div>
              </div>
              <div className="text-center text-clinic-blue text-sm font-bold select-none py-1 sm:py-0">➜</div>
              <div className="text-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-extrabold text-clinic-blue">2. กดคีย์ลัดตรึง</div>
                <div className="text-[9px] text-slate-500 mt-0.5">กด Win + Ctrl + T</div>
              </div>
              <div className="text-center text-clinic-blue text-sm font-bold select-none py-1 sm:py-0">➜</div>
              <div className="text-center p-2.5 bg-clinic-cyan/25 rounded-lg border border-clinic-cyan/40">
                <div className="text-[10px] font-extrabold text-clinic-blue">3. ล็อกอยู่หน้าสุด!</div>
                <div className="text-[9px] text-slate-500 mt-0.5">คีย์ข้อมูลเข้า HIS ได้สะดวกรวดเร็ว</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue flex items-center gap-1.5">
                <span>Microsoft PowerToys</span>
                <span className="text-[10px] bg-clinic-cyan/30 text-clinic-blue px-1.5 py-0.5 rounded font-black">แนะนำสำหรับ Windows 10/11</span>
              </strong>
              <ol className="list-decimal pl-4 text-xs text-slate-600 space-y-1.5">
                <li>ดาวน์โหลดและติดตั้งโปรแกรม <strong>Microsoft PowerToys</strong> ฟรีจาก Microsoft Store หรือหน้า GitHub ของ Microsoft</li>
                <li>เปิดโปรแกรม PowerToys แล้วคลิกเปิดใช้งานเครื่องมือ <strong>Always on Top</strong> (ปักหมุดไว้ด้านบนสุด)</li>
                <li>สลับหน้าจอไปที่เบราว์เซอร์ที่เปิดโปรแกรม WarfarinPro จากนั้นกดปุ่มลัดคีย์บอร์ด <strong><kbd className="font-mono bg-slate-100 border rounded px-1.5 py-0.5 text-slate-700 font-bold select-none">Win + Ctrl + T</kbd></strong></li>
                <li>หน้าต่างจะถูกตรึงไว้เหนือโปรแกรมอื่นๆ ตลอดเวลา (จะปรากฏเส้นขอบสีน้ำเงินรอบหน้าต่างพร้อมเสียงแจ้งเตือน)</li>
                <li>หากต้องการยกเลิกการตรึง ให้คลิกที่หน้าต่างเบราว์เซอร์นั้นแล้วกดปุ่มลัดเดิม <strong><kbd className="font-mono bg-slate-100 border rounded px-1.5 py-0.5 text-slate-700 font-bold select-none">Win + Ctrl + T</kbd></strong> อีกครั้ง</li>
              </ol>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue">
                DeskPins หรือ TurboTop (ทางเลือกสเปกเบาสำหรับ Windows เก่า)
              </strong>
              <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1.5">
                <li><strong>DeskPins:</strong> ทำการติดตั้งและรันโปรแกรม ดับเบิลคลิกไอคอนรูปหมุดที่ System Tray (มุมขวาล่างของจอ) เมาส์จะเปลี่ยนเป็นรูปหมุด จากนั้นคลิกปักหมุดที่แถบหัวเรื่อง (Title Bar) ของหน้าต่างเว็บแอป เพื่อล็อกให้อยู่หน้าสุด</li>
                <li><strong>TurboTop:</strong> รันโปรแกรมในซิสเต็มเทรย์ คลิกที่ไอคอน TurboTop จะมีรายชื่อหน้าต่างโปรแกรมที่เปิดอยู่ทั้งหมด ให้คลิกเลือกหน้าต่างเว็บแอป <strong>WarfarinPro</strong> เพื่อตรึงให้อยู่หน้าสุด</li>
              </ul>
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

        {/* Visual Workflow Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <svg className="h-5 w-5 stroke-[2.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            <h3 className="text-lg font-bold">Dosing & Prescription Workflow Flowchart</h3>
          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-7 items-center bg-white border border-clinic-line rounded-2xl p-5 shadow-sm">
            {/* Step 1 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">Step 1</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-clinic-blue/10 text-clinic-blue mx-auto font-black text-sm">
                INR
              </div>
              <div className="text-xs font-black text-slate-850">Enter Inputs</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                Input patient INR, previous dose, and safety flags.
              </div>
            </div>

            {/* Arrow 1 */}
            <div className="md:col-span-1 text-center py-1 md:py-0 select-none">
              <span className="hidden md:inline text-clinic-blue text-xl font-bold">➜</span>
              <span className="inline md:hidden text-clinic-blue text-lg font-bold">⬇</span>
            </div>

            {/* Step 2 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">Step 2</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 mx-auto font-black text-sm">
                AUTO
              </div>
              <div className="text-xs font-black text-slate-850">Auto Dosing</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                System calculates dose adjustment percentages automatically.
              </div>
            </div>

            {/* Arrow 2 */}
            <div className="md:col-span-1 text-center py-1 md:py-0 select-none">
              <span className="hidden md:inline text-clinic-blue text-xl font-bold">➜</span>
              <span className="inline md:hidden text-clinic-blue text-lg font-bold">⬇</span>
            </div>

            {/* Step 3 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">Step 3</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-orange-500/10 text-orange-600 mx-auto font-black text-sm">
                ENTER
              </div>
              <div className="text-xs font-black text-slate-850">Modal Review</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                Press Enter to open booklet modal, review doses, and close.
              </div>
            </div>

            {/* Arrow 3 */}
            <div className="md:col-span-1 text-center py-1 md:py-0 select-none">
              <span className="hidden md:inline text-clinic-blue text-xl font-bold">➜</span>
              <span className="inline md:hidden text-clinic-blue text-lg font-bold">⬇</span>
            </div>

            {/* Step 4 */}
            <div className="md:col-span-1 border border-slate-100 rounded-xl p-4 bg-slate-50 text-center space-y-1.5 relative overflow-hidden group hover:shadow-md transition-all">
              <div className="text-[10px] uppercase font-bold text-slate-400">Step 4</div>
              <div className="inline-grid h-10 w-10 place-items-center rounded-lg bg-purple-500/10 text-purple-600 mx-auto font-black text-sm">
                QR
              </div>
              <div className="text-xs font-black text-slate-850">Print / Share</div>
              <div className="text-[10px] text-slate-500 leading-normal">
                Print sticker labels, scan QR code or share patient view link.
              </div>
            </div>
          </div>
        </section>

        {/* Clinician Workspace */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <HeartPulse size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">1. Clinician Workspace Guide</h3>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
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
                Hospital Tablet Stock Setup
              </strong>
              <p className="text-xs text-slate-600 leading-relaxed">
                Configure clinic stock strengths using either <strong>2 & 3 mg tablets</strong> or <strong>2, 3 & 5 mg tablets</strong> (introducing Pink 5 mg). Incorporating the 5 mg strength minimizes tablet splitting and counts for patients on high doses, increasing dispensing speed and safety.
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
                    <th className="p-3">Action Description / Hotkey Sequence</th>
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
                      <strong>(Outside Popups):</strong> Move focus downward / upward through inputs. Pressing Enter on the last hold-dose field automatically opens the Booklet Summary Modal.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-500">Enter (in Booklet Modal)</td>
                    <td className="p-3">
                      <strong>1st Press:</strong> Automatically scrolls the modal body down to check tablet counts and printing layout. <br />
                      <strong>2nd Press:</strong> Closes the summary popup window immediately.
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono font-bold text-slate-500">Escape (Esc)</td>
                    <td className="p-3">Close any open popup dialog or warnings immediately</td>
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

        {/* Always on Top Guide */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-clinic-blue">
            <Pin size={20} className="stroke-[2.5]" />
            <h3 className="text-lg font-bold">3. Running Alongside Hospital HIS (Always on Top Mode)</h3>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            For seamless medical record data entry without switching windows back and forth, you can lock the <strong>WarfarinPro</strong> web app window on top of your hospital information system (HIS) screen using the following utilities:
          </p>

          {/* Visual Always on Top Flow */}
          <div className="bg-slate-50 border border-clinic-line/60 rounded-xl p-4 space-y-3">
            <div className="text-xs font-extrabold text-slate-600 uppercase tracking-wider">Always on Top Workflow Flowchart</div>
            <div className="grid gap-2 grid-cols-1 sm:grid-cols-5 items-center bg-white p-3 rounded-xl border border-clinic-line/40 shadow-sm max-w-2xl">
              <div className="text-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-extrabold text-clinic-blue">1. Open Side-by-Side</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Arrange browser next to HIS</div>
              </div>
              <div className="text-center text-clinic-blue text-sm font-bold select-none py-1 sm:py-0">➜</div>
              <div className="text-center p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="text-[10px] font-extrabold text-clinic-blue">2. Press Shortcut</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Press Win + Ctrl + T</div>
              </div>
              <div className="text-center text-clinic-blue text-sm font-bold select-none py-1 sm:py-0">➜</div>
              <div className="text-center p-2.5 bg-clinic-cyan/25 rounded-lg border border-clinic-cyan/40">
                <div className="text-[10px] font-extrabold text-clinic-blue">3. Window Locked!</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Input data to HIS without losing focus</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue flex items-center gap-1.5">
                <span>Microsoft PowerToys</span>
                <span className="text-[10px] bg-clinic-cyan/30 text-clinic-blue px-1.5 py-0.5 rounded font-black">Recommended for Windows 10/11</span>
              </strong>
              <ol className="list-decimal pl-4 text-xs text-slate-600 space-y-1.5">
                <li>Download and install <strong>Microsoft PowerToys</strong> (available free in the Microsoft Store or on GitHub).</li>
                <li>Launch PowerToys and verify that the <strong>Always on Top</strong> feature is enabled.</li>
                <li>Click the WarfarinPro browser window and press the hotkey shortcut <strong><kbd className="font-mono bg-slate-100 border rounded px-1.5 py-0.5 text-slate-700 font-bold select-none">Win + Ctrl + T</kbd></strong>.</li>
                <li>The window will be locked on top of all other software with a colored blue border and a confirmation chime.</li>
                <li>Press the same shortcut again <strong><kbd className="font-mono bg-slate-100 border rounded px-1.5 py-0.5 text-slate-700 font-bold select-none">Win + Ctrl + T</kbd></strong> to unlock/release the window.</li>
              </ol>
            </div>
            <div className="border border-clinic-line rounded-xl p-4 bg-white space-y-2">
              <strong className="block text-sm font-extrabold text-clinic-blue">
                DeskPins or TurboTop (Lightweight legacy alternatives)
              </strong>
              <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1.5">
                <li><strong>DeskPins:</strong> Run DeskPins, double-click the pin icon in the System Tray (bottom-right corner), and click the browser's title bar to lock it on top.</li>
                <li><strong>TurboTop:</strong> Run TurboTop, click its menu icon in the system tray, and check the <strong>WarfarinPro</strong> window in the list to pin it.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    );
  }
}
