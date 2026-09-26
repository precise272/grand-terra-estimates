import type { Metadata } from "next";
import "./globals.css";
import "./premium.css";
export const metadata:Metadata={title:"Grand Terra Estimates",description:"Create and manage contractor estimates, invoices, clients, and job photos.",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",apple:"/apple-touch-icon.png"},appleWebApp:{capable:true,statusBarStyle:"default",title:"GT Estimates"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en-CA"><body>{children}</body></html>}


