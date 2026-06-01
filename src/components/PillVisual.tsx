import type { DayDose } from "../types";
import type { ReactNode } from "react";

const ORANGE = { fill: "#f8a87c", stroke: "#f59a68", text: "#fff" };
const BLUE = { fill: "#78bef7", stroke: "#5fa9e7", text: "#fff" };

function WholePill({ color, label }: { color: typeof ORANGE; label: string }) {
  return (
    <svg
      width="38"
      height="26"
      viewBox="0 0 38 26"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <rect
        x="1"
        y="1"
        width="36"
        height="24"
        rx="12"
        ry="12"
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth="1"
      />
      <text
        x="19"
        y="17"
        textAnchor="middle"
        fill={color.text}
        fontSize="12"
        fontWeight="900"
        fontFamily="Inter,sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

function HalfPill({ color, label }: { color: typeof ORANGE; label: string }) {
  return (
    <svg
      width="46"
      height="26"
      viewBox="0 0 46 26"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <defs>
        <clipPath id="half-clip">
          <polygon points="0,0 37,0 46,26 0,26" />
        </clipPath>
      </defs>
      <rect
        x="1"
        y="1"
        width="44"
        height="24"
        rx="12"
        ry="12"
        fill={color.fill}
        stroke={color.stroke}
        strokeWidth="1"
        clipPath="url(#half-clip)"
      />
      <text
        x="20"
        y="17"
        textAnchor="middle"
        fill={color.text}
        fontSize="11"
        fontWeight="900"
        fontFamily="Inter,sans-serif"
      >
        {label}
      </text>
    </svg>
  );
}

function HoldPill({ text }: { text: string }) {
  return (
    <svg
      width="74"
      height="26"
      viewBox="0 0 74 26"
      style={{ display: "inline-block", verticalAlign: "middle", minWidth: "74px" }}
    >
      <rect x="1" y="1" width="72" height="24" rx="12" ry="12" fill="#b91c1c" />
      <text
        x="37"
        y="17"
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="900"
        fontFamily="Inter,sans-serif"
      >
        {text}
      </text>
    </svg>
  );
}

export default function PillVisual({
  combo,
  hold,
  lang = "th",
}: {
  combo: DayDose["combo"];
  hold?: boolean;
  lang?: "th" | "en";
}) {
  if (hold || combo.dose === 0) return <HoldPill text={lang === "th" ? "งดทานยา" : "HOLD"} />;

  const pills: ReactNode[] = [];
  for (let i = 0; i < combo.orangeWhole; i++)
    pills.push(<WholePill key={`ow-${i}`} color={ORANGE} label="2" />);
  for (let i = 0; i < combo.orangeHalf; i++)
    pills.push(<HalfPill key={`oh-${i}`} color={ORANGE} label="1/2" />);
  for (let i = 0; i < combo.blueWhole; i++)
    pills.push(<WholePill key={`bw-${i}`} color={BLUE} label="3" />);
  for (let i = 0; i < combo.blueHalf; i++)
    pills.push(<HalfPill key={`bh-${i}`} color={BLUE} label="1/2" />);

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "2px",
        minWidth: "120px",
      }}
    >
      {pills}
    </span>
  );
}
