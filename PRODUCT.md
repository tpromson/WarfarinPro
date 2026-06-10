# Product

## Register

product

## Users
- **Clinicians**: Internists and anticoagulation clinic pharmacists working in high-density, fast-paced outpatient clinics. They require high efficiency, quick calculation entry, and immediate printing or label dispatch capabilities.
- **Patients & Caregivers**: A diverse group including elderly patients on long-term therapy, mechanical heart valve recipients, and their family caregivers. They access the Patient Viewer on smartphones (often offline) or follow printed dosing sheets and adhesive labels at home.

## Product Purpose
To provide physician-directed clinical decision support for warfarin dosing, eliminating mathematical errors and translating complex weekly pill schedules into ultra-simple, clear daily instruction views for patients.

A single clinician-issued Medication Plan produces five distinct outputs from one source of truth:
- **Screen view**: interactive Patient Viewer for smartphones, shareable via Plan QR
- **A5 Medication Sheet**: printable PDF for handing to patients at the end of a visit
- **Adhesive label**: compact ZPL format for clinic label printers, QR-primary layout
- **Voice Guidance**: Thai-language audio narration of the full weekly schedule
- **W-code + Plan QR**: compact share code and QR that reopens the plan in the Patient Viewer without carrying identifying patient information

## Brand Personality
- Clean & Minimal (เรียบง่ายสะอาดตา)
- Friendly & Approachable (เป็นมิตรเข้าถึงง่าย)
- Empathetic & Trusted Clinical Authority

## Anti-references
- "AI slop" aesthetics: neon glows, dark-mode-first interfaces, tech-startup purple-to-blue gradients, and generic SaaS card-nesting patterns.
- High-density, low-contrast clinical software that causes eye strain or fatigue.
- Over-designed animations or page reveals that slow down high-throughput clinic workflows.

## Design Principles
- **Instant Recognition (รู้ได้ทันที)**: A patient or caregiver must understand today's dose (how many pills and what colors to take) in less than two seconds without cognitive re-interpretation.
- **High-Throughput Clinical Speed**: Minimize mouse clicks and screen changes for clinicians; every secondary panel or calculation must serve a direct decision-support step.
- **Explicit Safety Boundaries**: Clearly differentiate Danger Alerts (high-risk but modifiable plans) from Hard Stops (blocking clinical safety thresholds) using distinct visual hierarchies.

## Accessibility & Inclusion
- **Vision Impairment & Aging**: Large typography, high color-contrast ratios, and clear spatial separation between days of the week.
- **Colorblind Support**: Tablet representations must rely on double-encoding (using shape, size, text labels, and color) to represent doses (e.g. 3 mg blue vs 5 mg peach) so colorblind users can safely distinguish them.
- **Thai Audio Narration**: Voice Guidance uses Google Chirp 3 HD (Thai) with gender-aware particles and natural speaking rate, falling back to browser Web Speech API. Narration is generated strictly from the Medication Plan — no custom instructions that deviate from the schedule. Designed for elderly and low-literacy patients.
