import "./globals.css";

export const metadata = {
  title: "PK Business ERP Suite",
  description: "Integrated multi-business ERP demonstration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
