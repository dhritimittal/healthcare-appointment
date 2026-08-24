import "./globals.css";
import SessionProviderWrapper from "@/components/SessionProviderWrapper";

export const metadata = {
  title: "Healthcare Appointment Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
