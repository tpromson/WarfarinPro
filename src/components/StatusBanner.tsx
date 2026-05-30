import { AlertTriangle } from "lucide-react";
import type { DoseSuggestion } from "../types";

export default function StatusBanner({ suggestion }: { suggestion: DoseSuggestion }) {
  return (
    <div className={`status ${suggestion.severity}`} role="alert" aria-live="polite">
      <AlertTriangle size={20} />
      <div>
        <strong>{suggestion.label}</strong>
        {suggestion.messages.map((message) => (
          <p key={message}>{message}</p>
        ))}
      </div>
    </div>
  );
}
