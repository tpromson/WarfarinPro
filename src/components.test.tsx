import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PillVisual from "./components/PillVisual";
import HardStop from "./components/HardStop";
import StatusBanner from "./components/StatusBanner";
import ScheduleView from "./components/ScheduleView";
import type { DayDose } from "./types";

function makeCombo(overrides: Partial<DayDose["combo"]> = {}): DayDose["combo"] {
  return {
    dose: 5,
    orangeWhole: 1,
    orangeHalf: 0,
    blueWhole: 1,
    blueHalf: 0,
    score: 3,
    ...overrides,
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
    expect(
      screen.getByText("Do not generate routine dosing instructions."),
    ).toBeInTheDocument();
  });

  it("renders provided reasons", () => {
    render(<HardStop reasons={["Test reason 1", "Test reason 2"]} />);
    expect(screen.getByText("Test reason 1")).toBeInTheDocument();
    expect(screen.getByText("Test reason 2")).toBeInTheDocument();
  });

  it("renders empty reasons list", () => {
    render(<HardStop reasons={[]} />);
    expect(
      screen.getByText("Do not generate routine dosing instructions."),
    ).toBeInTheDocument();
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
    const { container } = render(
      <ScheduleView title="Test" subtitle="Test" schedule={schedule} />,
    );
    const dayRows = container.querySelectorAll(".day-row");
    expect(dayRows.length).toBe(7);
  });

  it("shows hold label for zero-dose days", () => {
    const schedule = makeSchedule([0, 5, 5, 5, 5, 5, 5]);
    const { container } = render(
      <ScheduleView title="Test" subtitle="Test" schedule={schedule} />,
    );
    expect(container.textContent).toContain("งดทานยา");
  });

  it("shows dose text in mg", () => {
    const schedule = makeSchedule([5, 0, 3, 0, 5, 3, 5]);
    const { container } = render(
      <ScheduleView title="Test" subtitle="Test" schedule={schedule} />,
    );
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
