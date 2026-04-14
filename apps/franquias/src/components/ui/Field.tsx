"use client";

import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  name: string;
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  type?: "text" | "email" | "tel" | "number" | "url" | "color";
  placeholder?: string;
  required?: boolean;
  hint?: string;
  disabled?: boolean;
  maxLength?: number;
};

export function Field({
  label,
  name,
  value,
  onChange,
  onBlur,
  type = "text",
  placeholder,
  required,
  hint,
  disabled,
  maxLength,
}: FieldProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 flex items-center gap-1 text-sm font-medium text-brand-text">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        maxLength={maxLength}
        className={cn(
          "w-full rounded-lg border border-brand-text/10 px-4 py-2.5 text-sm",
          "focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      />
      {hint && <p className="mt-1 text-xs text-brand-text/60">{hint}</p>}
    </div>
  );
}

type TextAreaProps = Omit<FieldProps, "type"> & { rows?: number };

export function TextArea({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  hint,
  rows = 4,
  maxLength,
}: TextAreaProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 flex items-center gap-1 text-sm font-medium text-brand-text">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        value={(value ?? "") as string}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        className={cn(
          "w-full rounded-lg border border-brand-text/10 px-4 py-2.5 text-sm",
          "focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary",
          "resize-y",
        )}
      />
      {hint && <p className="mt-1 text-xs text-brand-text/60">{hint}</p>}
    </div>
  );
}

type SelectProps = {
  label: string;
  name: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
};

export function Select({ label, name, value, onChange, onBlur, options, required, hint }: SelectProps) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 flex items-center gap-1 text-sm font-medium text-brand-text">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        required={required}
        className="w-full rounded-lg border border-brand-text/10 px-4 py-2.5 text-sm focus:border-brand-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
      >
        <option value="">Selecione...</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="mt-1 text-xs text-brand-text/60">{hint}</p>}
    </div>
  );
}

type CardPickerProps = {
  label: string;
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string; descricao?: string }[];
  required?: boolean;
};

export function CardPicker({ label, value, onChange, options, required }: CardPickerProps) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-1 text-sm font-medium text-brand-text">
        {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-lg border-2 p-3 text-left text-sm transition",
              value === opt.value
                ? "border-brand-primary bg-brand-primary/5"
                : "border-brand-text/10 hover:border-brand-primary/40",
            )}
          >
            <div className="font-medium text-brand-text">{opt.label}</div>
            {opt.descricao && (
              <div className="mt-0.5 text-xs text-brand-text/60">{opt.descricao}</div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function AutoSaveHint({ salvando, ultimoSalvoEm }: { salvando: boolean; ultimoSalvoEm?: Date | null }) {
  const [tempo, setTempo] = useState("");
  useEffect(() => {
    if (!ultimoSalvoEm) return;
    const update = () => {
      const segs = Math.round((Date.now() - ultimoSalvoEm.getTime()) / 1000);
      if (segs < 5) setTempo("agora mesmo");
      else if (segs < 60) setTempo(`há ${segs}s`);
      else setTempo(`há ${Math.round(segs / 60)}min`);
    };
    update();
    const i = setInterval(update, 15_000);
    return () => clearInterval(i);
  }, [ultimoSalvoEm]);

  return (
    <div className="text-xs text-brand-text/50">
      {salvando ? "Salvando..." : ultimoSalvoEm ? `Salvo ${tempo}` : ""}
    </div>
  );
}

export function FormWrapper({ children, title, descricao }: { children: ReactNode; title: string; descricao?: string }) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-brand-text">{title}</h2>
        {descricao && <p className="mt-1 text-sm text-brand-text/60">{descricao}</p>}
      </header>
      {children}
    </div>
  );
}
