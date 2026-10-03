import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata = {
  title: "morabaraba",
  description:
    "Morabaraba. Connect. Strategize. Conquer.",
};

export default function RootLayout({
  children,
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}