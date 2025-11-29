import type { Metadata } from "next";
import "./globals.css";
import { ApiKeyProvider } from "@/contexts/ApiKeyContext";

export const metadata: Metadata = {
  title: "Test Case Generator",
  description: "Generate test cases from PRD documents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ApiKeyProvider>{children}</ApiKeyProvider>
      </body>
    </html>
  );
}

