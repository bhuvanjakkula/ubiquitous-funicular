import type {Metadata} from "next";
import {ClerkProvider} from "@clerk/nextjs";
import "./globals.css";
export const metadata:Metadata={title:"BorderBooks Matcher",description:"Deterministic invoice and transaction reconciliation with an explainable audit trail."};
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider><html lang="en"><body>{children}</body></html></ClerkProvider>;}
