import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import { ToastProvider } from "@/components/ui";

export const metadata = {
  title: "IB Nexus",
  description: "The all-in-one platform for IB students",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider><Navbar /><div className="pt-[72px]">{children}</div></ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
