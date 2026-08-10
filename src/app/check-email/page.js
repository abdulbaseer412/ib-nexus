import { Suspense } from "react";
import CheckEmailClient from "./CheckEmailClient";

export const metadata = {
  title: "Verify Your Email — IB Nexus",
  description: "Check your inbox to verify your IB Nexus account.",
};

function CheckFallback() {
  return (
    <main className="surface min-h-[calc(100vh-4rem)] px-4 py-12 flex items-center justify-center">
      <div className="card animate-pulse mx-auto flex w-full max-w-md flex-col items-center justify-center p-7 sm:p-10 space-y-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gray-200 dark:bg-gray-800 mx-auto" />
        <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg w-48 mx-auto" />
        <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64 mx-auto" />
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-full" />
      </div>
    </main>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckFallback />}>
      <CheckEmailClient />
    </Suspense>
  );
}
