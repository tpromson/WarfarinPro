# WarfarinPro

WarfarinPro is a physician-directed warfarin dosing support context. It helps clinicians create medication plans and helps patients understand clinician-issued instructions.

## Language

**Clinician**:
A healthcare professional who may review INR information and issue a warfarin medication plan. A clinician may be a doctor, pharmacist, or nurse depending on clinic policy.
_Avoid_: Provider, staff, operator

**Patient Viewer**:
The patient-facing view that explains an already-issued medication plan. It does not calculate or change warfarin dosing from new INR values.
_Avoid_: Patient self-management, patient calculator

**Medication Plan**:
A clinician-issued warfarin instruction for a specific weekly dose and any hold days. A medication plan is what patients follow and what printed or shared instructions represent.
_Avoid_: Prescription, self-adjustment, recommendation

**Pill Schedule**:
The day-by-day tablet pattern within a medication plan. A pill schedule prioritizes correct weekly dose and memorable patterns before minimizing total tablet count.
_Avoid_: Dose optimizer, pill minimizer

**Complex Pill Schedule**:
A pill schedule that is harder for a patient to follow because it uses many tablets, mixed half-tablets, or irregular day-to-day patterns. It requires clinician review rather than automatic rejection.
_Avoid_: Invalid schedule, impossible schedule

**Rounded Schedule**:
A pill schedule whose weekly total differs slightly from the selected weekly dose because of tablet constraints. In the MVP, the acceptable difference is no more than 0.5 mg per week.
_Avoid_: Wrong dose, exact dose

**First Week Hold**:
A temporary hold instruction applied at the start of a medication plan. By default, it applies on the clinic visit day when the plan is issued, not on a day inferred from the W-code.
_Avoid_: Maintenance hold, W-code hold day

**First Week**:
The initial seven-day instruction window that starts on the clinic visit day. It may differ from the long-term pattern because temporary hold instructions apply there first.
_Avoid_: Week one, loading week

**Maintenance Week**:
The repeatable long-term weekly pattern of a medication plan. It is presented as Monday through Sunday for patient familiarity.
_Avoid_: First week, calendar week

**W-code**:
A compact share code that summarizes a medication plan's actual schedule weekly dose and hold-day count. It encodes weekly dose in tenths of a milligram and does not replace the full medication plan.
_Avoid_: Plan ID, prescription code, full schedule code

**Plan QR**:
A QR representation of a medication plan that can be opened in the Patient Viewer. It carries the plan details needed for display but excludes identifying patient information.
_Avoid_: W-code QR, patient identity QR

**Voice Guidance**:
An audio explanation generated from a medication plan. It must not introduce dosing instructions that are absent from the medication plan.
_Avoid_: Free-text voice note, custom dosing narration

**Medication Sheet**:
A printable patient instruction document for a medication plan. It may include blank patient identification fields for handwriting, but the app does not store or encode those values.
_Avoid_: Prescription export, patient record

**Saved Plan**:
A medication plan intentionally stored on the current device for offline viewing. It excludes identifying patient information and is not an audit log.
_Avoid_: Patient record, dosing history, audit log

**Identifying Patient Information**:
Patient information that can identify who a medication plan belongs to. It is excluded from Plan QR and local-first MVP storage.
_Avoid_: PHI, personal details, patient profile

**Clinical Decision Support**:
The clinician-facing support that helps calculate and review a possible warfarin medication plan. It is not autonomous prescribing.
_Avoid_: AI dosing, automatic prescribing

**Hard Stop**:
A safety state where standard warfarin dosing support must not issue a medication plan or W-code. It applies to INR at or above the hard-stop threshold, pregnancy, or major bleeding, and directs the clinician to urgent clinical review instead of routine dose adjustment.
_Avoid_: Severe alert, red warning, override prompt

**Reversal Guidance**:
A safety prompt that a patient may need urgent warfarin reversal or escalation according to local protocol. WarfarinPro does not issue reversal medication orders in the MVP.
_Avoid_: Vitamin K order, FFP order, reversal prescription

**Danger Alert**:
A high-risk warning state where routine dosing support may still issue a clinician-reviewed medication plan. It is distinct from a Hard Stop because it warns and constrains the workflow without blocking plan generation.
_Avoid_: Hard stop, routine alert

**Interaction Flag**:
A clinician-selected risk marker for medicines or exposures that may affect warfarin safety. It warns the clinician but does not automatically change dose calculation in the MVP.
_Avoid_: Interaction database, automatic dose modifier

**Clinical Context Flag**:
A clinician-selected patient context that changes safety emphasis without making the app an autonomous prescriber. Mechanical valve is a clinical context flag as well as a target-range preset.
_Avoid_: Diagnosis engine, automatic protocol branch

## Example Dialogue

Clinician: "The INR result is outside target, so I will use Clinical Decision Support to draft a Medication Plan."

Developer: "Can the Patient Viewer adjust the plan if the patient enters a new INR?"

Clinician: "No. The Patient Viewer only explains the Medication Plan already issued by a Clinician."

Developer: "Can we rebuild the full Medication Plan from only the W-code?"

Clinician: "No. The W-code is a compact summary, while the Medication Plan remains the source of truth."

Developer: "Can every possible warfarin plan be represented as a W-code?"

Clinician: "No. A W-code only carries compact weekly dose and hold-count information."

Developer: "Should the QR code only contain the W-code?"

Clinician: "No. The Plan QR carries the Medication Plan details needed by the Patient Viewer, but excludes Identifying Patient Information."

Developer: "Can a clinician type custom voice instructions that differ from the schedule?"

Clinician: "No. Voice Guidance is generated from the Medication Plan so the spoken instructions match the visible schedule."

Developer: "Can the Medication Sheet show a patient name or HN?"

Clinician: "Only as blank fields for handwriting. The app should not store or encode Identifying Patient Information in the MVP."

Developer: "Should the app automatically keep every plan it opens?"

Clinician: "No. A Saved Plan is stored only when the user intentionally saves it on the current device."

Developer: "If INR is above the hard-stop threshold, should we still generate a W-code?"

Clinician: "No. A Hard Stop prevents routine Medication Plan and W-code generation."

Developer: "Should WarfarinPro prescribe Vitamin K or FFP?"

Clinician: "No. It may show Reversal Guidance, but reversal treatment follows local protocol outside the MVP."

Developer: "If INR is 6.2 and there is no major bleeding, is that a Hard Stop?"

Clinician: "No. That is a Danger Alert: the clinician may still issue a reviewed Medication Plan."

Developer: "If the patient has an antibiotic Interaction Flag, should the calculator change the dose automatically?"

Clinician: "No. The flag should warn the clinician, but dose selection remains a clinician decision."

Developer: "Is mechanical valve only an INR target range?"

Clinician: "No. It is also a Clinical Context Flag that should increase safety emphasis."

Developer: "Should the Pill Schedule use the fewest possible tablets?"

Clinician: "Only after the weekly dose and memorable pattern are preserved."

Developer: "If the generated schedule needs more than three tablets on a day, is it invalid?"

Clinician: "No. It is a Complex Pill Schedule that needs review."

Developer: "If the weekly total is off by 0.5 mg because of tablet constraints, is the plan invalid?"

Clinician: "No. That is a Rounded Schedule. Larger differences must be corrected before sharing."

Developer: "If a patient needs a hold day after a clinic visit, which day should be held?"

Clinician: "Use a First Week Hold on the clinic visit day by default."

Developer: "Should the first seven days and the repeatable schedule always look the same?"

Clinician: "No. The First Week starts on the clinic visit day, while the Maintenance Week is the long-term Monday-to-Sunday pattern."
