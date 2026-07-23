import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "PK Business ERP Suite - Version 2.0",
  description: "Clickable multi-business ERP demo",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
