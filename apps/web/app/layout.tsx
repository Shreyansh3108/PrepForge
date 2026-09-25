import type { Metadata } from "next";
import "./globals.css"; // THIS IS THE CRITICAL LINE

export const metadata: Metadata = {
  title: "PrepForge | Interview Kit",
  description: "Generate tailored interview prep kits",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}