import { ShieldAlert } from "lucide-react";
import Panel from "./Panel";

export default function HardStop({ reasons }: { reasons: string[] }) {
  return (
    <Panel title="Urgent Clinical Review" icon={<ShieldAlert size={18} />}>
      <div className="hard-stop">
        <h2>Do not generate routine dosing instructions.</h2>
        <p>This case meets Hard Stop criteria. Use local urgent evaluation and reversal protocols as clinically appropriate.</p>
        <ul>
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}
