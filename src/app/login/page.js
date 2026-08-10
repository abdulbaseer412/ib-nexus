import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import SignInForm from "./SignInForm";

export const metadata = {
  title: "Sign In — IB Nexus",
  description: "Sign in to your IB Nexus account.",
};

function SignInFallback() {
  return (
    <div className="w-full max-w-sm space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded-lg mx-auto w-48" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl" />
    </div>
  );
}

export default async function LoginPage() {
  const user = await getAuthUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="surface min-h-[calc(100vh-4rem)] px-4 py-12">
      <div className="card animate-in mx-auto flex w-full max-w-md flex-col items-center justify-center p-7 sm:p-10">
        <Suspense fallback={<SignInFallback />}>
          <SignInForm />
        </Suspense>
      </div>
    </main>
  );
}
