import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project Zenith — The Celestial Eye",
  description: "Real-time celestial observatory. Select any location on Earth and observe the sky above you.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Must set CESIUM_BASE_URL before Cesium workers initialize */}
        <Script id="cesium-base-url" strategy="beforeInteractive">
          {`window.CESIUM_BASE_URL = '/cesium/';`}
        </Script>
      </head>
      <body className="antialiased font-sans bg-space-black text-soft-white">
        {children}
      </body>
    </html>
  );
}
