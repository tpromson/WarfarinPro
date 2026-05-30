import type { ReactNode } from "react";

export default function IconButton({
  icon,
  label,
  onClick,
  disabled,
  id,
  shortcut,
  className,
  "aria-haspopup": ariaHasPopup,
  "aria-expanded": ariaExpanded,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  id?: string;
  shortcut?: string;
  className?: string;
  "aria-haspopup"?: boolean | "dialog" | "menu" | "listbox" | "tree" | "grid" | "false" | "true";
  "aria-expanded"?: boolean;
}) {
  return (
    <button
      id={id}
      className={`icon-button ${className || ""}`}
      onClick={onClick}
      disabled={disabled}
      title={shortcut ? `${label} [${shortcut}]` : label}
      aria-haspopup={ariaHasPopup}
      aria-expanded={ariaExpanded}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
