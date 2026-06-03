# WarfarinPro User Manual

Welcome to the **WarfarinPro** User Manual, a clinical decision support tool designed to streamline warfarin dosing, eliminate mathematical errors for clinicians, and provide clear, intuitive daily dosing instructions for patients and their caregivers.

---

## 1. Introduction & Purpose

**WarfarinPro** is designed around the core philosophy: **"The Patient's Safety Compass"**. It addresses two critical challenges in warfarin therapy:
1. **For Clinicians**: Reduces calculation errors for weekly dosing adjustments and accelerates checkout workflows in high-volume clinics.
2. **For Patients & Caregivers**: Translates complex weekly dose totals into visual, color-coded daily pill schedules that patients can immediately identify without guesswork.

> [!WARNING]
> **Legal Disclaimer**
> WarfarinPro is a clinical decision support tool and is not an autonomous prescribing system. It does not replace professional clinical judgment. The final dosing decision remains the sole responsibility of the treating clinician.

---

## 2. Clinician Guide

This section describes the clinical workflow, calculation inputs, safety classification, and customization features within the clinician workspace.

### 2.1 Clinical Inputs
Enter the clinical data in the designated fields:
* **Current INR (Alt+I)**: The patient's latest laboratory INR test result.
* **Previous weekly dose (Alt+P)**: The cumulative weekly dose (mg) the patient has been taking.
* **Target range (Alt+T)**: Choose the appropriate therapeutic window based on the clinical indication:
  * *Standard*: 2.0–3.0 (for AF, DVT, PE, etc.)
  * *Mechanical valve*: 2.5–3.5 (for mechanical heart valve recipients)
  * *Custom range*: Define personalized boundaries manually.
* **Clinic visit day (Alt+V)**: Select the day of the clinical check. The system uses this day to schedule initial loading hold days.

### 2.2 Safety Banners & Severity States
The application automatically compares inputs to categorize safety risks and guide clinicians:
1. **Normal (Green Banner)**: INR is in range. Recommended action is to maintain the current weekly dose.
2. **Caution (Orange Banner)**: INR is slightly out of range. Prompts a small % dose adjustment and hold day options.
3. **Danger (Red Banner)**: INR is significantly out of bounds (e.g., INR ≥ 5.0). Displays guidelines for vitamin K administration and holds.
4. **Hard Stop (Dark Red Banner)**: Critical conditions (e.g., **Major bleeding** (Alt+B) or **Pregnancy**) that prohibit routine dose calculation. The system halts plan generation and prompts urgent emergency protocols.

### 2.3 Safety Flags
Clinicians can document patient risk markers under the **Safety Flags** panel, categorized to reduce cognitive load:
* **Critical Safety & Context**: Major Bleeding (Alt+B), Mechanical Valve, Pregnancy, Liver Disease.
* **Drug Interaction Flags**: NSAIDs, Antibiotics, Amiodarone, Antiepileptics, Herbals/Supplements, Alcohol.

### 2.4 Keyboard Shortcuts Reference
Designed for clinician checkout speed in high-throughput outpatient clinics:

> [!NOTE]
> **For macOS (Mac) Users**: You can use either the **Control (⌃)** or **Option (⌥)** key in place of the `Alt` key (e.g., press `Ctrl+I` or `Option+I` instead of `Alt+I`) to avoid conflict with Mac system text input behaviors.

| Shortcut | Action Description |
|---|---|
| **Alt + I** | Focus the Current INR field |
| **Alt + P** | Focus the Previous weekly dose field |
| **Alt + T** | Toggle / Open the Target range selection |
| **Alt + V** | Toggle / Open the Clinic visit day selection |
| **Alt + B** | Toggle the Major Bleeding safety checkbox |
| **Alt + D** | Select / Toggle the Dose Adjustment percentage options |
| **Alt + F** | Select / Toggle the first-week hold days options |
| **Alt + S** | Open the Booklet Transcription / Share Summary modal |
| **Alt + O** | Switch tab to the Patient Viewer mode |
| **Alt + C** | Copy the Patient Link to clipboard (notifies with a non-blocking toast) |
| **Alt + H** | Trigger browser print dialog for printing labels or sheets |
| **Enter** | Jump focus to the next field (INR -> Prev Dose -> Target -> Clinic Day -> Adjustment -> Hold Days -> Daily schedule inputs) |
| **Shift + Enter** | Jump focus back to the previous input field |
| **Escape** | Dismiss / Close the booklet summary dialog |

### 2.5 Dose Customization & Schedule Editing
* The calculator suggests a standard schedule automatically.
* Clinicians can override individual days in the **Editable Maintenance Week** panel using select fields.
* **Reset to Suggestion Button**: If manual modifications lead to weekly dose deviations or errors, a **Reset to Suggestion (Undo icon)** button appears under the editor to instantly restore the calculated recommendation.

---

## 3. Understanding the W-Code

The **W-code** is a compact shorthand (e.g., `W120-2H`) used to write dosing plans into booklets or patient profiles:
* **Weekly Dose (e.g., W120)**: The total weekly dose multiplied by 10. `W120` represents a weekly cumulative dose of **12.0 mg** (e.g., four 3 mg tablets).
* **Hold Indicator (e.g., 2H)**: Shorthand for **Hold**. Represents the number of temporary hold days scheduled at the start of the first week (beginning on the visit day). `2H` means hold the dose for the first 2 days.

---

## 4. Patient Viewer Guide

Patients or caregivers scan the **QR code** on printed sheets or open the shared link on their smartphone to load the **Patient Mode**, which works offline once loaded.

### 4.1 Color-Coded Double-Encoding
Tablet representations use shape, size, color, and numerical values so low-vision or colorblind patients can safely identify doses:
* 🟠 **Small Orange Pill**: Represents **2 mg** (shows "2" in center text).
* 🔵 **Medium Blue Pill**: Represents **3 mg** (shows "3" in center text).
* 🔴 **Red Bar (HOLD)**: Instructs to skip taking medication on this day (0 mg).
* 🌓 **Half Pill Symbol**: Features a transparent dark mask on the right half with a sharp white vertical split line to preserve white `"1/2"` text contrast.

### 4.2 Dosing Calendars
* **First Week Schedule**: Displays instructions starting on the clinic check day. It incorporates any temporary hold days.
* **Maintenance Week Schedule**: Repeats weekly (Monday to Sunday) for long-term dosing until the next clinic appointment.

### 4.3 Voice Guidance (Read-Aloud Support)
* Patients can click the **"Read Instructions Aloud"** button.
* The system reads daily dosing instructions (e.g., *"Monday, take 2 milligrams, which is 1 orange tablet"*) in clear Thai or English to reduce reading errors.

### 4.4 Saving and Offline Browsing
* Click **"Save Plan"** to store the plan inside the mobile browser's memory.
* The plan is accessible without an active internet connection at home.
