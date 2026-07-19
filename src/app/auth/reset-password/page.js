import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Set New Password — IB Nexus",
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-white dark:bg-black px-4 py-12">
      <ResetPasswordForm />
    </main>
  );
}
