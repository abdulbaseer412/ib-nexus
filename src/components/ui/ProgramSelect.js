"use client";

import { useEffect, useRef, useState } from "react";
import { IB_PROGRAMS } from "@/lib/constants";

/**
 * Accessible custom select for IB Programme.
 * Replaces native <select> whose <option> elements cannot be styled in dark mode
 * on Windows Chrome/Firefox due to OS-level rendering.
 * Implements ARIA combobox/listbox pattern.
 */
export default function ProgramSelect({ name, defaultValue = "", disabled = false }) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  const selected = IB_PROGRAMS.find((p) => p.value === value);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false);
    }

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const idx = IB_PROGRAMS.findIndex((p) => p.value === value);
        const next =
          e.key === "ArrowDown"
            ? Math.min(idx + 1, IB_PROGRAMS.length - 1)
            : Math.max(idx - 1, 0);
        setValue(IB_PROGRAMS[next].value);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, value]);

  function select(val) {
    setValue(val);
    setOpen(false);
    buttonRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input carries the value into the parent <form> */}
      <input type="hidden" name={name} value={value} />

      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="IB Programme"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-left text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 disabled:opacity-50 transition-shadow flex items-center justify-between"
      >
        <span className={selected ? "" : "text-gray-400 dark:text-gray-500"}>
          {selected ? selected.label : "Select your programme"}
        </span>
        <svg
          className={`w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="IB Programme options"
          className="absolute z-50 mt-1.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg shadow-black/10 dark:shadow-black/40 overflow-hidden"
        >
          {IB_PROGRAMS.map((program) => (
            <li
              key={program.value}
              role="option"
              aria-selected={value === program.value}
              onClick={() => select(program.value)}
              className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                value === program.value
                  ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
            >
              {program.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
