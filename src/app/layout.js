import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ui";
import NexusOpeningExperience from "@/components/NexusOpeningExperience";
import { IS_APPLICATION_LOCKED } from "@/lib/constants";

export const metadata = {
  title: "IB Nexus — Academic Workspace",
  description: "The all-in-one platform for IB students",
  verification: {
    google: "97BLhkWS1aklkv7yqov_9UD5lykl__oIK2zpt441_0Q",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="relative bg-[#07070a] text-white">
        <div className="aurora-bg" aria-hidden="true" />
        <ThemeProvider>
          <ToastProvider>
            {!IS_APPLICATION_LOCKED && <Navbar />}
            <div className={IS_APPLICATION_LOCKED ? "" : "pt-[72px]"}>{children}</div>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


