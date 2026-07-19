import { Suspense } from "react";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Reset Password — IB Nexus",
  description: "Reset your IB Nexus account password.",
};

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-white dark:bg-black px-4 py-12">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </main>
  );
}
