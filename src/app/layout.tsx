import type { Metadata, Viewport } from "next";
import { ClerkProvider, SignedIn } from "@clerk/nextjs";
import Nav from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Corner",
  description: "Just for the two of us",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="bg-white text-neutral-800 antialiased">
          <SignedIn>
            <Nav />
          </SignedIn>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
