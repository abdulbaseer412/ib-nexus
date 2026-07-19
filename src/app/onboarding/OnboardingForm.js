"use client";

import { inputClassName } from "@/components/auth/auth-styles";
import ProgramSelect from "@/components/ui/ProgramSelect";
import { useActionState } from "react";

const initialState = { error: "" };

export default function OnboardingForm({
  defaults,
  needsDisplayName,
  needsProgram,
  completeOnboarding,
}) {
  const [state, formAction, pending] = useActionState(
    async (_prevState, formData) => {
      const result = await completeOnboarding(formData);
      return result ?? initialState;
    },
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-5 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50"
    >
      {needsDisplayName ? (
        <div>
          <label
            htmlFor="display_name"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            type="text"
            required
            minLength={2}
            maxLength={50}
            defaultValue={defaults.displayName}
            placeholder="Your name"
            disabled={pending}
            className={inputClassName}
          />
        </div>
      ) : (
        <input type="hidden" name="display_name" value={defaults.displayName} />
      )}

      {needsProgram ? (
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            IB Programme
          </label>
          <ProgramSelect
            name="ib_program"
            defaultValue={defaults.ibProgram}
            disabled={pending}
          />
        </div>
      ) : (
        <input type="hidden" name="ib_program" value={defaults.ibProgram} />
      )}

      {state.error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full py-2.5 rounded-xl bg-black text-white dark:bg-white dark:text-black font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {pending ? "Saving…" : "Continue to Dashboard"}
      </button>
    </form>
  );
}
