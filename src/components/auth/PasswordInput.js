"use client";

import { useState, useId } from "react";
import { inputClassName } from "./auth-styles";

// ─── Strength calculation ────────────────────────────────────────────────────

function getStrength(password) {
  if (!password) return { score: 0, label: "", color: "" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Weak", color: "bg-red-500" };
  if (score === 2) return { score, label: "Fair", color: "bg-orange-400" };
  if (score === 3) return { score, label: "Good", color: "bg-yellow-400" };
  if (score === 4) return { score, label: "Strong", color: "bg-green-500" };
  return { score, label: "Very strong", color: "bg-green-600" };
}

// ─── Eye icons ───────────────────────────────────────────────────────────────

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * PasswordInput — production-ready password field.
 *
 * Props:
 *   id            — input id (auto-generated if omitted)
 *   name          — form field name
 *   placeholder   — placeholder text
 *   autoComplete  — "current-password" | "new-password" (default: "current-password")
 *   disabled      — boolean
 *   value         — controlled value (optional)
 *   onChange      — change handler (optional)
 *   showStrength  — show strength meter below the field (use on signup)
 *   required      — boolean
 */
export default function PasswordInput({
  id,
  name,
  placeholder = "Password",
  autoComplete = "current-password",
  disabled = false,
  value,
  onChange,
  showStrength = false,
  required = false,
}) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const [internalValue, setInternalValue] = useState("");

  // Support both controlled (value+onChange) and uncontrolled usage
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  function handleChange(e) {
    if (!isControlled) setInternalValue(e.target.value);
    onChange?.(e);
  }

  const strength = showStrength ? getStrength(currentValue) : null;

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          id={inputId}
          name={name}
          // Switching between "text" and "password" is what enables show/hide.
          // Keeping the same name/autocomplete ensures password managers work correctly.
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          value={isControlled ? value : undefined}
          defaultValue={!isControlled ? undefined : undefined}
          onChange={handleChange}
          // pr-10 reserves space so text never overlaps the toggle button
          className={`${inputClassName} pr-10`}
        />

        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-controls={inputId}
          // Positioned inside the input on the right
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded"
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {/* Strength meter — only rendered when showStrength=true and user has typed */}
      {showStrength && currentValue.length > 0 && (
        <div className="space-y-1" aria-live="polite" aria-label={`Password strength: ${strength.label}`}>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((bar) => (
              <div
                key={bar}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  bar <= strength.score
                    ? strength.color
                    : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Strength:{" "}
            <span
              className={
                strength.score <= 1
                  ? "text-red-500"
                  : strength.score === 2
                  ? "text-orange-400"
                  : strength.score === 3
                  ? "text-yellow-500"
                  : "text-green-500"
              }
            >
              {strength.label}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
