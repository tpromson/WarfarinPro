export default function Metric({
  label,
  value,
  tone = "normal",
  description,
}: {
  label: string;
  value: string;
  tone?: "normal" | "caution" | "danger";
  description?: string;
}) {
  return (
    <div className={`metric ${tone}`} title={description}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
