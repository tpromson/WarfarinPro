import type { ReactNode } from "react";

export default function Panel({
  title,
  icon,
  children,
  id,
  className,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={`panel ${className || ""}`}>
      <div className="panel-title">
        {icon}
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}
