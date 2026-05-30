import { Trash2 } from "lucide-react";
import type { MedicationPlan } from "../types";

export default function SavedPlanList({ plans, onSelect, onDelete }: { plans: MedicationPlan[]; onSelect: (plan: MedicationPlan) => void; onDelete: (id: string) => void }) {
  return (
    <div className="space-y-2">
      {plans.map((plan) => (
        <div key={plan.id} className="saved-plan">
          <button onClick={() => onSelect(plan)}>
            <strong>{plan.wCode}</strong>
            <span>{plan.issuedDate} · {plan.scheduleWeeklyDose.toFixed(1)} mg/week</span>
          </button>
          <button className="trash" onClick={() => onDelete(plan.id)} title="Delete saved plan">
            <Trash2 size={17} />
          </button>
        </div>
      ))}
    </div>
  );
}
