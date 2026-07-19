"use client";

import Link from "next/link";
import { useState } from "react";
import GoogleButton from "@/components/auth/GoogleButton";
import FormMessage from "@/components/auth/FormMessage";
import { buttonClassName } from "@/components/auth/auth-styles";

export default function HomeGuestActions() {
  const [error, setError] = useState("");

  return (
    <div className="w-full max-w-sm space-y-3">
      <GoogleButton onError={setError} />
      <Link href="/signup" className={`${buttonClassName} block text-center`}>
        Create Account
      </Link>
      <Link
        href="/login"
        className="block w-full py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white font-medium text-center hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
      >
        Sign In
      </Link>
      <FormMessage type="error" message={error} />
    </div>
  );
}
