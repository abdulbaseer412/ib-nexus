import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

import Navbar from "@/components/Navbar";
import WebsiteLockEnforcer from "@/components/WebsiteLockEnforcer";
import { ToastProvider } from "@/components/ui";

export const metadata = {
  title: "IB Nexus",
  description: "Your personal IB academic AI assistant.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <ThemeProvider>
          <ToastProvider>
            <WebsiteLockEnforcer />
            <Navbar />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
