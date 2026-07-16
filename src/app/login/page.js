"use client";

import { useSearchParams } from "next/navigation";
// (add this import at the very top of the file with your other imports)

import { createClient } from "@/utils/supabase-browser";
import { useState } from "react";

export default function LoginPage() {
  const supabase = createClient();
  console.log("SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const searchParams = useSearchParams();
  const urlError = searchParams.get("error");

  const handleGoogleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      alert("Google login error: " + error.message);
      console.error(error);
    } else {
      console.log("Redirecting to:", data.url);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      alert("Email login error: " + error.message);
      console.error(error);
    }
    setMessage(error ? error.message : "Check your email for a login link!");
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
          Log in to IB Nexus
        </h1>

        <button
          onClick={handleGoogleLogin}
          className="w-full py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
        >
          Continue with Google
        </button>

        <div className="text-center text-gray-400 text-sm">or</div>

        <form onSubmit={handleEmailLogin} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white"
          />
          <button
            type="submit"
            className="w-full py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black"
          >
            Send login link
          </button>
        </form>

        {message && (
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">{message}</p>
        )}

        {urlError && (
          <p className="text-center text-sm text-red-500">{decodeURIComponent(urlError)}</p>
        )}
      </div>
    </main>
  );
}