import { useState } from "react";

export default function NumberField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  id,
  shortcut,
  onKeyDown,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  id?: string;
  shortcut?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  const [inputValue, setInputValue] = useState(value.toString());

  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    if (Number(inputValue) !== value) {
      setInputValue(value.toString());
    }
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = event.target.value;
    setInputValue(valStr);
    const parsed = Number(valStr);
    if (!isNaN(parsed) && valStr !== "") {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    if (inputValue === "" || isNaN(Number(inputValue))) {
      onChange(min);
      setInputValue(min.toString());
    } else {
      const parsed = Number(inputValue);
      const bounded = Math.max(min, Math.min(max, parsed));
      onChange(bounded);
      setInputValue(bounded.toString());
    }
  };

  return (
    <label className="field">
      <span className="flex items-center justify-between">
        <span>{label}</span>
        {shortcut && (
          <kbd className="text-[9px] font-mono bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-semibold select-none border border-slate-200">
            {shortcut}
          </kbd>
        )}
      </span>
      <input
        id={id}
        type="number"
        value={inputValue}
        min={min}
        max={max}
        step={step}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={onKeyDown}
        onFocus={(e) => e.target.select()}
      />
    </label>
  );
}
