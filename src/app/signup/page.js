import SignUpForm from "./SignUpForm";

export const metadata = {
  title: "Create Account — IB Nexus",
  description: "Join IB Nexus and start your IB journey.",
};

export default function SignUpPage() {
  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-white dark:bg-black px-4 py-12">
      <SignUpForm />
    </main>
  );
}
