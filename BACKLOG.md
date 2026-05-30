# WarfarinPro - Backlog

> รายการ tasks ที่ยังต้องทำ เรียงตามความสำคัญ

---

## High Priority

### 1. ปุ่ม "คัดลอกไปทุกวัน" (Copy to All Days)
**Problem**: ถ้าคนไข้กินยาเท่ากันทุกวัน ต้องเลือก/กดทีละวัน 7 ครั้ง
**Solution**: ปุ่ม `📋 Copy to All` ข้าง dose input — กดครั้งเดียว copy ค่าปัจจุบันไปทุกวัน
**Acceptance**:
- [ ] Copy ค่าจากวันที่เลือกอยู่ไปทุกวัน (จันทร์–อาทิตย์)
- [ ] มี confirm step ก่อน paste เพราะผิดพลาดแก้ยาก
- [ ] Undo ถ้ากดผิด

---

### 2. Toggle "วันคู่ / วันคี่" (Odd/Even Day Pattern)
**Problem**: ตารางสลับวันคู่-คี่ เป็น pattern ที่พบบ่อยมากใน warfarin แต่ต้องกรอกมือ 7 ช่อง
**Solution**: ปุ่ม toggle ที่ auto-fill วันคู่/คี่ ให้เลือก dose สำหรับ odd days และ even days แล้ว auto-fill ที่เหลือ
**Acceptance**:
- [ ] Toggle button สลับโหมด manual/odd-even
- [ ] เลือก dose สำหรับ Odd days (Mon, Wed, Fri, Sun) และ Even days (Tue, Thu, Sat)
- [ ] Auto-fill ช่องที่เหลือตาม pattern
- [ ] แสดงสรุป "วันคี่ X mg, วันคู่ Y mg" ก่อน confirm

---

## Medium Priority

### 3. Keyboard Navigation ใน Pill Schedule Editor
**Context**: Drag & Drop ถูก reject เพราะ tablet + safety concerns
**Solution**: เน้น keyboard shortcuts แทน
**Acceptance**:
- [ ] `Tab` / `Shift+Tab` เลื่อนระหว่างช่องวัน
- [ ] `↑/↓` เลื่อนระหว่าง dose options
- [ ] `Enter` ยืนยัน + เลื่อนไปช่องถัดไป
- [ ] Visual focus ring ชัดเจน (already exists: Alt+S glow)

---

### 4. Undo / Redo ใน Dose Editor
**Problem**: กดผิดแก้ยาก โดยเฉพาะ copy-to-all
**Solution**: Undo/Redo stack
**Acceptance**:
- [ ] `Ctrl+Z` / `Cmd+Z` undo
- [ ] `Ctrl+Shift+Z` / `Cmd+Shift+Z` redo
- [ ] Undo ทำงานทุก action ใน dose editor
- [ ] จำ state ย้อนหลังได้ 20 steps

---

## Low Priority / Future

### 5. Dose History Log
เก็บว่าแต่ละ plan เปลี่ยน dose อย่างไร (audit trail) — อยู่นอก MVP scope

### 6. INR Target Range Configuration
ตั้งค่า target range ต่างกันตาม clinical context (เช่น mechanical valve vs AF) — ต้อง discuss กับ clinician ก่อน

### 7. Interaction Flag Quick-Add
ปุ่มลัดเพิ่ม interaction flags ที่ใช้บ่อย (เช่น antibiotic, aspirin) — flag แต่ไม่ auto-change dose

---

## Rejected / Not Doing

- ❌ **Drag & Drop** — tablet touch ไม่ reliable + chronological constraint ทำให้ reorder วันเสี่ยง
- ❌ **Auto-reduce dose จาก interaction** — dose decision ต้องเป็น clinician decision เท่านั้น