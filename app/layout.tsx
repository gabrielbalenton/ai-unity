import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import "./appearance.css";

export const metadata:Metadata={
 title:"UNITY | Personal Alpha",
 description:"A project-scoped AI workspace, designed to keep you in control"
};

export default function RootLayout({children}:{children:React.ReactNode}){
 return <html lang="en" suppressHydrationWarning>
  <body>
   <Script src="/theme-init.js" strategy="beforeInteractive"/>
   {children}
  </body>
 </html>;
}
