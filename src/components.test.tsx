import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PillVisual from "./components/PillVisual";
import HardStop from "./components/HardStop";
import StatusBanner from "./components/StatusBanner";
import ScheduleView from "./components/ScheduleView";
import PatientMode from "./components/PatientMode";
import DoctorMode from "./components/DoctorMode";
import StaffLogin from "./components/StaffLogin";
import StaffCoordination from "./components/StaffCoordination";
import DoctorSessionPanel from "./components/DoctorSessionPanel";
import PharmacySessionPanel from "./components/PharmacySessionPanel";
import CoordinationSavePanel from "./components/CoordinationSavePanel";
import MedicationSheet from "./components/MedicationSheet";
import { speechController } from "./tts";
import type { DayDose, MedicationPlan } from "./types";

const coordinationApiMock = vi.hoisted(() => ({
  findSessionByHn: vi.fn(),
  loadClinicSession: vi.fn(),
  loadOpenCorrectionRequest: vi.fn(),
  loadTodayClinicSessions: vi.fn(),
  loadStaffProfile: vi.fn(),
  requestCorrection: vi.fn(),
  resolveCorrectionForSession: vi.fn(),
  savePlanToCoordinationSession: vi.fn(),
}));

vi.mock("./coordination/api", () => coordinationApiMock);

const supabaseClientMock = vi.hoisted(() => ({
  getUser: vi.fn(),
}));

vi.mock("./coordination/supabaseClient", () => ({
  getSupabaseClient: () => ({
    auth: {
      getUser: supabaseClientMock.getUser,
    },
  }),
}));

function makeCombo(overrides: Partial<DayDose["combo"]> = {}): DayDose["combo"] {
  return {
    dose: 5,
    orangeWhole: 1,
    orangeHalf: 0,
    blueWhole: 1,
    blueHalf: 0,
    pinkWhole: 0,
    pinkHalf: 0,
    score: 3,
    ...overrides,
  };
}

function makePlan(): MedicationPlan {
  const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
  const week = days.map((day) => ({
    day,
    dose: 5,
    combo: makeCombo(),
  }));
  return {
    version: 1,
    id: "patient-mode-test-plan",
    issuedDate: "2026-06-18",
    clinicDay: "mon",
    target: { preset: "standard", lower: 2, upper: 3 },
    currentInr: 2.4,
    previousWeeklyDose: 35,
    calculatedWeeklyDose: 35,
    scheduleWeeklyDose: 35,
    selectedAdjustment: 0,
    firstWeekHoldDoses: 0,
    wCode: "W123",
    safety: {
      severity: "normal",
      messages: [],
      interactionFlags: [],
      contextFlags: [],
      complexSchedule: false,
      roundedSchedule: false,
      majorBleeding: false,
    },
    firstWeek: week,
    maintenanceWeek: week,
  };
}

describe("PillVisual", () => {
  it("renders HOLD when hold is true", () => {
    const combo = makeCombo();
    const { container } = render(<PillVisual combo={combo} hold={true} />);
    expect(container.textContent).toContain("งดทานยา");
  });

  it("renders HOLD when dose is 0", () => {
    const combo = makeCombo({ dose: 0 });
    const { container } = render(<PillVisual combo={combo} />);
    expect(container.textContent).toContain("งดทานยา");
  });

  it("renders in English when lang=en", () => {
    const combo = makeCombo({ dose: 0 });
    const { container } = render(<PillVisual combo={combo} lang="en" />);
    expect(container.textContent).toContain("HOLD");
  });

  it("renders pill SVGs for a valid combo", () => {
    const combo = makeCombo({ orangeWhole: 2, blueWhole: 0, blueHalf: 0 });
    const { container } = render(<PillVisual combo={combo} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("renders mixed orange and blue pills", () => {
    const combo = makeCombo({ orangeWhole: 1, blueWhole: 1 });
    const { container } = render(<PillVisual combo={combo} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(2);
  });

  it("renders half pill", () => {
    const combo = makeCombo({ orangeWhole: 0, orangeHalf: 1, blueWhole: 0, blueHalf: 0 });
    const { container } = render(<PillVisual combo={combo} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
  });
});

describe("HardStop", () => {
  it("renders hard stop heading", () => {
    render(<HardStop reasons={["INR >= 9.0", "Major bleeding"]} />);
    expect(screen.getByText("Do not generate routine dosing instructions.")).toBeInTheDocument();
  });

  it("renders provided reasons", () => {
    render(<HardStop reasons={["Test reason 1", "Test reason 2"]} />);
    expect(screen.getByText("Test reason 1")).toBeInTheDocument();
    expect(screen.getByText("Test reason 2")).toBeInTheDocument();
  });

  it("renders empty reasons list", () => {
    render(<HardStop reasons={[]} />);
    expect(screen.getByText("Do not generate routine dosing instructions.")).toBeInTheDocument();
  });
});

describe("StatusBanner", () => {
  it("renders hard-stop severity label", () => {
    render(
      <StatusBanner
        suggestion={{
          severity: "hard-stop",
          label: "Hard Stop",
          defaultAdjustment: 0,
          adjustmentOptions: [0],
          holdDoseOptions: [],
          defaultHoldDoses: 0,
          messages: ["Urgent review required."],
          hardStopReasons: ["INR >= 9.0"],
          reversalGuidance: true,
        }}
      />,
    );
    expect(screen.getByText("Hard Stop")).toBeInTheDocument();
    expect(screen.getByText("Urgent review required.")).toBeInTheDocument();
  });

  it("renders danger severity label", () => {
    render(
      <StatusBanner
        suggestion={{
          severity: "danger",
          label: "Danger Alert",
          defaultAdjustment: -15,
          adjustmentOptions: [-15, -10],
          holdDoseOptions: [1, 2],
          defaultHoldDoses: 2,
          messages: ["INR 5.0-8.9 warning."],
          hardStopReasons: [],
          reversalGuidance: true,
        }}
      />,
    );
    expect(screen.getByText("Danger Alert")).toBeInTheDocument();
  });

  it("renders normal severity label", () => {
    render(
      <StatusBanner
        suggestion={{
          severity: "normal",
          label: "Normal",
          defaultAdjustment: 0,
          adjustmentOptions: [-7.5, 0, 7.5],
          holdDoseOptions: [0, 1],
          defaultHoldDoses: 0,
          messages: [],
          hardStopReasons: [],
          reversalGuidance: false,
        }}
      />,
    );
    expect(screen.getByText("Normal")).toBeInTheDocument();
  });

  it("renders multiple messages", () => {
    render(
      <StatusBanner
        suggestion={{
          severity: "caution",
          label: "Caution",
          defaultAdjustment: 0,
          adjustmentOptions: [0],
          holdDoseOptions: [0],
          defaultHoldDoses: 0,
          messages: ["Message 1", "Message 2"],
          hardStopReasons: [],
          reversalGuidance: false,
        }}
      />,
    );
    expect(screen.getByText("Message 1")).toBeInTheDocument();
    expect(screen.getByText("Message 2")).toBeInTheDocument();
  });
});

describe("ScheduleView", () => {
  function makeSchedule(doses: number[]): DayDose[] {
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
    return days.map((day, i) => ({
      day,
      dose: doses[i] ?? 0,
      hold: doses[i] === 0,
      combo: makeCombo({ dose: doses[i] ?? 0 }),
    }));
  }

  it("renders schedule title and subtitle", () => {
    const schedule = makeSchedule([5, 5, 5, 5, 5, 5, 5]);
    render(<ScheduleView title="Maintenance" subtitle="Weekly plan" schedule={schedule} />);
    expect(screen.getByText("Maintenance")).toBeInTheDocument();
    expect(screen.getByText("Weekly plan")).toBeInTheDocument();
  });

  it("renders all 7 days", () => {
    const schedule = makeSchedule([5, 5, 5, 5, 5, 5, 5]);
    const { container } = render(<ScheduleView title="Test" subtitle="Test" schedule={schedule} />);
    const dayRows = container.querySelectorAll(".day-row");
    expect(dayRows.length).toBe(7);
  });

  it("shows hold label for zero-dose days", () => {
    const schedule = makeSchedule([0, 5, 5, 5, 5, 5, 5]);
    const { container } = render(<ScheduleView title="Test" subtitle="Test" schedule={schedule} />);
    expect(container.textContent).toContain("งดทานยา");
  });

  it("shows dose text in mg", () => {
    const schedule = makeSchedule([5, 0, 3, 0, 5, 3, 5]);
    const { container } = render(<ScheduleView title="Test" subtitle="Test" schedule={schedule} />);
    expect(container.textContent).toContain("5 mg");
    expect(container.textContent).toContain("3 mg");
  });

  it("renders in English", () => {
    const schedule = makeSchedule([0, 5, 5, 5, 5, 5, 5]);
    const { container } = render(
      <ScheduleView title="Schedule" subtitle="Plan" schedule={schedule} lang="en" />,
    );
    expect(container.textContent).toContain("Monday");
    expect(container.textContent).toContain("HOLD");
  });

  it("shows first-week before-clinic markers", () => {
    const schedule = makeSchedule([0, 5, 5, 5, 5, 5, 5]);
    const { container } = render(
      <ScheduleView
        title="First Week"
        subtitle="Initial"
        schedule={schedule}
        isFirstWeek={true}
        clinicDay="wed"
      />,
    );
    expect(container.textContent).toContain("ก่อนวันปรับยา");
  });
});

describe("MedicationSheet", () => {
  it("marks QR placeholders with fixed-square classes", () => {
    render(<MedicationSheet plan={makePlan()} lang="th" printLayout="half-a4" />);

    expect(screen.getByRole("img", { name: "กำลังสร้าง QR" })).toHaveClass("qr-code-box");
  });
});

describe("DoctorMode keyboard workflow", () => {
  beforeEach(() => {
    localStorage.setItem("warfarinpro.tablet_setup", "2_3");
    coordinationApiMock.loadStaffProfile.mockReset();
    coordinationApiMock.savePlanToCoordinationSession.mockReset();
    supabaseClientMock.getUser.mockReset();
  });

  afterEach(() => {
    localStorage.removeItem("warfarinpro.tablet_setup");
  });

  it("moves focus to coordination HN after closing the booklet summary with Enter", async () => {
    render(
      <DoctorMode
        lang="th"
        onOpenPatient={vi.fn()}
        printLayout="half-a4"
        setPrintLayout={vi.fn()}
      />,
    );

    fireEvent.keyDown(window, { key: "s", altKey: true, code: "KeyS" });
    const dialog = await screen.findByRole("dialog", { name: "สรุปสำหรับลงสมุดยา & แนะนำผู้ป่วย" });
    await waitFor(() => expect(dialog).toHaveFocus());

    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByLabelText("HN")).toHaveFocus();
    });
  });

  it("focuses new case after saving coordination and resets the doctor form with Enter", async () => {
    supabaseClientMock.getUser.mockResolvedValueOnce({
      data: { user: { id: "doctor-1" } },
      error: null,
    });
    coordinationApiMock.loadStaffProfile.mockResolvedValueOnce({
      userId: "doctor-1",
      role: "doctor",
      displayName: "Doctor A",
      active: true,
    });
    coordinationApiMock.savePlanToCoordinationSession.mockResolvedValueOnce({
      sessionId: "session-1",
      created: true,
    });

    render(
      <DoctorMode
        lang="th"
        onOpenPatient={vi.fn()}
        printLayout="half-a4"
        setPrintLayout={vi.fn()}
      />,
    );

    const inrInput = document.getElementById("inr-input") as HTMLInputElement;
    fireEvent.change(inrInput, { target: { value: "3.7" } });
    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.submit(screen.getByLabelText("HN").closest("form")!);

    const newCaseButton = await screen.findByRole("button", { name: "เริ่มเคสใหม่" });
    await waitFor(() => expect(newCaseButton).toHaveFocus());

    fireEvent.keyDown(newCaseButton, { key: "Enter" });
    fireEvent.click(newCaseButton);

    await waitFor(() => {
      expect(inrInput).toHaveValue(2.4);
      expect(screen.getByLabelText("HN")).toHaveValue("");
      expect(inrInput).toHaveFocus();
    });
  });
});

describe("PatientMode voice model display", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_GOOGLE_TTS_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            audioContent: "ZmFrZS1tcDM=",
            voiceName: "th-TH-Chirp3-HD-Kore",
          }),
      }),
    );
    class MockAudio {
      currentTime = 0;
      addEventListener = vi.fn();
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
    }
    vi.stubGlobal("Audio", MockAudio);
    sessionStorage.clear();
  });

  afterEach(() => {
    speechController.stop();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("shows the current read-aloud voice model in Thai patient mode", async () => {
    const plan = makePlan();
    await speechController.play(plan, "female", "th");

    render(
      <PatientMode
        plan={plan}
        savedPlans={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        lang="th"
        printLayout="half-a4"
        setPrintLayout={vi.fn()}
      />,
    );

    expect(screen.getAllByText(/เสียงที่ใช้/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/th-TH-Chirp3-HD-Kore/).length).toBeGreaterThan(0);
  });

  it("shows a cloud TTS failure message and retry action", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: () => Promise.resolve("cloud unavailable"),
    } as Response);
    const plan = makePlan();

    render(
      <PatientMode
        plan={plan}
        savedPlans={[]}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onSelect={vi.fn()}
        lang="th"
        printLayout="half-a4"
        setPrintLayout={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("กดฟังเสียงแนะนำยา"));

    await waitFor(() => {
      expect(screen.getByText(/ไม่สามารถสร้างเสียงอ่านจาก Cloud TTS ได้/)).toBeInTheDocument();
    });
    expect(screen.getByText("ลองอีกครั้ง")).toBeInTheDocument();
  });
});

describe("StaffLogin", () => {
  it("submits email and password", () => {
    const onLogin = vi.fn();
    render(<StaffLogin lang="th" loading={false} error="" onLogin={onLogin} />);

    fireEvent.change(screen.getByLabelText("อีเมล"), { target: { value: "doctor@example.com" } });
    fireEvent.change(screen.getByLabelText("รหัสผ่าน"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "เข้าสู่ระบบเจ้าหน้าที่" }));

    expect(onLogin).toHaveBeenCalledWith("doctor@example.com", "secret123");
  });

  it("shows login errors", () => {
    render(<StaffLogin lang="en" loading={false} error="Invalid credentials" onLogin={vi.fn()} />);

    expect(screen.getByText("Invalid credentials")).toBeInTheDocument();
  });
});

describe("StaffCoordination", () => {
  beforeEach(() => {
    coordinationApiMock.findSessionByHn.mockReset();
    coordinationApiMock.loadClinicSession.mockReset();
    coordinationApiMock.loadOpenCorrectionRequest.mockReset();
    coordinationApiMock.loadOpenCorrectionRequest.mockResolvedValue(null);
    coordinationApiMock.loadTodayClinicSessions.mockReset();
    coordinationApiMock.loadTodayClinicSessions.mockResolvedValue([]);
    coordinationApiMock.requestCorrection.mockReset();
    coordinationApiMock.resolveCorrectionForSession.mockReset();
    coordinationApiMock.resolveCorrectionForSession.mockResolvedValue(undefined);
  });

  it("shows doctor workflow for doctor role", () => {
    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u1", role: "doctor", displayName: "Doctor A", active: true }}
      />,
    );

    expect(screen.getByText("Doctor A")).toBeInTheDocument();
    expect(screen.getByText("เปิดหรือสร้าง session วันนี้")).toBeInTheDocument();
  });

  it("shows pharmacist workflow for pharmacist role", () => {
    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    expect(screen.getByText("Pharmacist B")).toBeInTheDocument();
    expect(screen.getByText("ค้นหา session วันนี้")).toBeInTheDocument();
  });

  it("loads today's sessions into a privacy-safe worklist", async () => {
    coordinationApiMock.loadTodayClinicSessions.mockResolvedValueOnce([
      {
        id: "session-abcdef",
        sessionHash: "hashed-hn",
        clinicDate: "2026-06-21",
        status: "physician_reviewed",
        currentPlan: makePlan(),
        expiresAt: "2026-06-21T23:59:59.000+07:00",
        createdBy: "doctor-1",
        physicianReviewedBy: "doctor-1",
        physicianReviewedAt: "2026-06-21T12:00:00.000Z",
        pharmacyReviewedBy: null,
        pharmacyReviewedAt: null,
        dispensedBy: null,
        dispensedAt: null,
      },
    ]);

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    expect(await screen.findByText("Session วันนี้")).toBeInTheDocument();
    expect(screen.getByText("session #abcdef")).toBeInTheDocument();
    expect(screen.getByText("physician_reviewed")).toBeInTheDocument();
    expect(screen.getAllByText("W123").length).toBeGreaterThan(0);
    expect(screen.queryByText("12345")).not.toBeInTheDocument();
  });

  it("highlights a worklist session after HN search finds it", async () => {
    coordinationApiMock.loadTodayClinicSessions.mockResolvedValueOnce([
      {
        id: "session-abcdef",
        sessionHash: "hashed-hn",
        clinicDate: "2026-06-21",
        status: "physician_reviewed",
        currentPlan: makePlan(),
        expiresAt: "2026-06-21T23:59:59.000+07:00",
        createdBy: "doctor-1",
        physicianReviewedBy: "doctor-1",
        physicianReviewedAt: "2026-06-21T12:00:00.000Z",
        pharmacyReviewedBy: null,
        pharmacyReviewedAt: null,
        dispensedBy: null,
        dispensedAt: null,
      },
    ]);
    coordinationApiMock.findSessionByHn.mockResolvedValueOnce({
      found: true,
      sessionId: "session-abcdef",
    });
    coordinationApiMock.loadClinicSession.mockResolvedValueOnce({
      id: "session-abcdef",
      sessionHash: "hashed-hn",
      clinicDate: "2026-06-21",
      status: "physician_reviewed",
      currentPlan: makePlan(),
      expiresAt: "2026-06-21T23:59:59.000+07:00",
      createdBy: "doctor-1",
      physicianReviewedBy: "doctor-1",
      physicianReviewedAt: "2026-06-21T12:00:00.000Z",
      pharmacyReviewedBy: null,
      pharmacyReviewedAt: null,
      dispensedBy: null,
      dispensedAt: null,
    });

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("ค้นหา session"));

    expect(await screen.findByText("ตรงกับ HN ที่ค้นหา")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เปิดใบยา session #abcdef" })).toBeInTheDocument();
  });

  it("loads and shows session details after finding today's session", async () => {
    coordinationApiMock.findSessionByHn.mockResolvedValueOnce({
      found: true,
      sessionId: "session-1",
    });
    coordinationApiMock.loadClinicSession.mockResolvedValueOnce({
      id: "session-1",
      sessionHash: "hashed-hn",
      clinicDate: "2026-06-21",
      status: "physician_reviewed",
      currentPlan: makePlan(),
      expiresAt: "2026-06-21T23:59:59.000+07:00",
      createdBy: "doctor-1",
      physicianReviewedBy: "doctor-1",
      physicianReviewedAt: "2026-06-21T12:00:00.000Z",
      pharmacyReviewedBy: null,
      pharmacyReviewedAt: null,
      dispensedBy: null,
      dispensedAt: null,
    });

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("ค้นหา session"));

    await waitFor(() => {
      expect(screen.getByText("สถานะ session: physician_reviewed")).toBeInTheDocument();
    });
    expect(coordinationApiMock.loadClinicSession).toHaveBeenCalledWith("session-1");
    expect(screen.getAllByText("W123").length).toBeGreaterThan(0);
  });

  it("opens a printable medication sheet from a found session plan", async () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => undefined);
    coordinationApiMock.findSessionByHn.mockResolvedValueOnce({
      found: true,
      sessionId: "session-1",
    });
    coordinationApiMock.loadClinicSession.mockResolvedValueOnce({
      id: "session-1",
      sessionHash: "hashed-hn",
      clinicDate: "2026-06-21",
      status: "physician_reviewed",
      currentPlan: makePlan(),
      expiresAt: "2026-06-21T23:59:59.000+07:00",
      createdBy: "doctor-1",
      physicianReviewedBy: "doctor-1",
      physicianReviewedAt: "2026-06-21T12:00:00.000Z",
      pharmacyReviewedBy: null,
      pharmacyReviewedAt: null,
      dispensedBy: null,
      dispensedAt: null,
    });

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("ค้นหา session"));

    await screen.findByRole("button", { name: "เปิดใบยาเพื่อพิมพ์" });
    fireEvent.click(screen.getByRole("button", { name: "เปิดใบยาเพื่อพิมพ์" }));

    expect(screen.getByText("ใบยา")).toBeInTheDocument();
    expect(screen.getByLabelText("ใบแนะนำการรับประทานยา")).toBeInTheDocument();
    expect(
      screen.getByLabelText("ใบแนะนำการรับประทานยา").closest(".coordination-sheet-visible"),
    ).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "พิมพ์ใบยา" }));
    expect(printSpy).toHaveBeenCalled();
  });

  it("hides coordination controls when printing the opened medication sheet", async () => {
    coordinationApiMock.findSessionByHn.mockResolvedValueOnce({
      found: true,
      sessionId: "session-1",
    });
    coordinationApiMock.loadClinicSession.mockResolvedValueOnce({
      id: "session-1",
      sessionHash: "hashed-hn",
      clinicDate: "2026-06-21",
      status: "physician_reviewed",
      currentPlan: makePlan(),
      expiresAt: "2026-06-21T23:59:59.000+07:00",
      createdBy: "doctor-1",
      physicianReviewedBy: "doctor-1",
      physicianReviewedAt: "2026-06-21T12:00:00.000Z",
      pharmacyReviewedBy: null,
      pharmacyReviewedAt: null,
      dispensedBy: null,
      dispensedAt: null,
    });

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "u2", role: "pharmacist", displayName: "Pharmacist B", active: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("ค้นหา session"));
    fireEvent.click(await screen.findByRole("button", { name: "เปิดใบยาเพื่อพิมพ์" }));

    const heading = screen.getByText("ประสานงานแพทย์-เภสัช");
    expect(heading.closest(".print\\:hidden")).not.toBeNull();
    expect(screen.getByLabelText("ใบแนะนำการรับประทานยา").closest(".print\\:hidden")).toBeNull();
  });

  it("lets doctors approve the existing plan to clear a correction request", async () => {
    coordinationApiMock.findSessionByHn.mockResolvedValueOnce({
      found: true,
      sessionId: "session-1",
    });
    coordinationApiMock.loadClinicSession.mockResolvedValueOnce({
      id: "session-1",
      sessionHash: "hashed-hn",
      clinicDate: "2026-06-21",
      status: "correction_requested",
      currentPlan: makePlan(),
      expiresAt: "2026-06-21T23:59:59.000+07:00",
      createdBy: "doctor-1",
      physicianReviewedBy: "doctor-1",
      physicianReviewedAt: "2026-06-21T12:00:00.000Z",
      pharmacyReviewedBy: null,
      pharmacyReviewedAt: null,
      dispensedBy: null,
      dispensedAt: null,
    });
    coordinationApiMock.loadOpenCorrectionRequest.mockResolvedValueOnce({
      id: "correction-1",
      sessionId: "session-1",
      reason: "pill_burden",
      note: "ลดจำนวนเม็ดยาได้ไหม",
      requestedBy: "pharmacist-1",
      requestedAt: "2026-06-21T12:05:00.000Z",
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
    });

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "doctor-1", role: "doctor", displayName: "Doctor A", active: true }}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("เปิดหรือสร้าง session"));

    expect(await screen.findByText("คำขอแก้ไขจากเภสัช")).toBeInTheDocument();
    expect(screen.getByText("pill_burden")).toBeInTheDocument();
    expect(screen.getByText("ลดจำนวนเม็ดยาได้ไหม")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve แผนเดิม" }));

    await waitFor(() => {
      expect(coordinationApiMock.resolveCorrectionForSession).toHaveBeenCalledWith({
        requestId: "correction-1",
        sessionId: "session-1",
        resolution: "rejected",
        userId: "doctor-1",
      });
    });
    expect(screen.getByText("แพทย์ approve แผนเดิมแล้ว")).toBeInTheDocument();
    expect(screen.getByText("สถานะ session: physician_reviewed")).toBeInTheDocument();
  });

  it("lets doctors mark the current plan as revised after a correction request", async () => {
    const plan = makePlan();
    coordinationApiMock.findSessionByHn.mockResolvedValueOnce({
      found: true,
      sessionId: "session-1",
    });
    coordinationApiMock.loadClinicSession.mockResolvedValueOnce({
      id: "session-1",
      sessionHash: "hashed-hn",
      clinicDate: "2026-06-21",
      status: "correction_requested",
      currentPlan: plan,
      expiresAt: "2026-06-21T23:59:59.000+07:00",
      createdBy: "doctor-1",
      physicianReviewedBy: "doctor-1",
      physicianReviewedAt: "2026-06-21T12:00:00.000Z",
      pharmacyReviewedBy: null,
      pharmacyReviewedAt: null,
      dispensedBy: null,
      dispensedAt: null,
    });
    coordinationApiMock.loadOpenCorrectionRequest.mockResolvedValueOnce({
      id: "correction-1",
      sessionId: "session-1",
      reason: "safety_concern",
      note: "INR สูง",
      requestedBy: "pharmacist-1",
      requestedAt: "2026-06-21T12:05:00.000Z",
      resolvedBy: null,
      resolvedAt: null,
      resolution: null,
    });

    const onEditCorrectionPlan = vi.fn();

    render(
      <StaffCoordination
        lang="th"
        profile={{ userId: "doctor-1", role: "doctor", displayName: "Doctor A", active: true }}
        onEditCorrectionPlan={onEditCorrectionPlan}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("เปิดหรือสร้าง session"));

    fireEvent.click(await screen.findByRole("button", { name: "ไปแก้ไขแผนยา" }));

    expect(onEditCorrectionPlan).toHaveBeenCalledWith({
      sessionId: "session-1",
      correctionRequestId: "correction-1",
      plan,
      reason: "safety_concern",
      note: "INR สูง",
    });
    expect(coordinationApiMock.resolveCorrectionForSession).not.toHaveBeenCalled();
  });

  it("saves a doctor-edited correction plan as physician revised", async () => {
    const plan = { ...makePlan(), currentInr: 3.2 };
    supabaseClientMock.getUser.mockResolvedValueOnce({
      data: { user: { id: "doctor-1" } },
      error: null,
    });
    coordinationApiMock.loadStaffProfile.mockResolvedValueOnce({
      userId: "doctor-1",
      role: "doctor",
      displayName: "Doctor A",
      active: true,
    });
    coordinationApiMock.resolveCorrectionForSession.mockResolvedValueOnce(undefined);

    render(
      <DoctorMode
        lang="th"
        onOpenPatient={vi.fn()}
        printLayout="half-a4"
        setPrintLayout={vi.fn()}
        correctionDraft={{
          sessionId: "session-1",
          correctionRequestId: "correction-1",
          plan,
          reason: "safety_concern",
          note: "INR สูง",
        }}
      />,
    );

    expect(screen.getByText("กำลังแก้ไขแผนยาจากคำขอเภสัช")).toBeInTheDocument();
    const inrInput = document.getElementById("inr-input") as HTMLInputElement;
    expect(inrInput).toHaveValue(3.2);

    fireEvent.change(inrInput, { target: { value: "2.8" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกแผนที่แก้ไขแล้ว" }));

    await waitFor(() => {
      expect(coordinationApiMock.resolveCorrectionForSession).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: "correction-1",
          sessionId: "session-1",
          resolution: "updated_plan",
          userId: "doctor-1",
        }),
      );
      expect(coordinationApiMock.resolveCorrectionForSession.mock.calls[0][0].plan.currentInr).toBe(
        2.8,
      );
    });
    expect(screen.getAllByText("แพทย์บันทึกแผนที่แก้ไขแล้ว").length).toBeGreaterThan(0);
  });

});

describe("DoctorSessionPanel", () => {
  it("submits HN to open or create today's session", () => {
    const onOpen = vi.fn();
    render(<DoctorSessionPanel lang="th" loading={false} error="" onOpenSession={onOpen} />);

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("เปิดหรือสร้าง session"));

    expect(onOpen).toHaveBeenCalledWith("12345");
  });
});

describe("PharmacySessionPanel", () => {
  it("submits HN to find today's session", () => {
    const onFind = vi.fn();
    render(
      <PharmacySessionPanel
        lang="th"
        loading={false}
        error=""
        onFindSession={onFind}
        onRequestCorrection={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByText("ค้นหา session"));

    expect(onFind).toHaveBeenCalledWith("12345");
  });

  it("submits structured correction reason and short note", () => {
    const onRequestCorrection = vi.fn();
    render(
      <PharmacySessionPanel
        lang="th"
        loading={false}
        error=""
        onFindSession={vi.fn()}
        onRequestCorrection={onRequestCorrection}
      />,
    );

    fireEvent.change(screen.getByLabelText("เหตุผล"), { target: { value: "pill_burden" } });
    fireEvent.change(screen.getByLabelText("หมายเหตุสั้น ๆ"), {
      target: { value: "จำนวนเม็ดยาต่อวันสูง" },
    });
    fireEvent.click(screen.getByText("ขอให้แพทย์แก้ไข"));

    expect(onRequestCorrection).toHaveBeenCalledWith("pill_burden", "จำนวนเม็ดยาต่อวันสูง");
  });
});

describe("CoordinationSavePanel", () => {
  it("submits HN to save the current plan", () => {
    const onSave = vi.fn();
    render(<CoordinationSavePanel lang="th" loading={false} error="" status="" onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("HN"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "บันทึกเข้า session แพทย์-เภสัช" }));

    expect(onSave).toHaveBeenCalledWith("12345");
  });

  it("shows save status", () => {
    render(
      <CoordinationSavePanel
        lang="en"
        loading={false}
        error=""
        status="Saved to coordination session"
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText("Saved to coordination session")).toBeInTheDocument();
  });
});
