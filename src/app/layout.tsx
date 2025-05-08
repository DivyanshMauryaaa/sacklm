import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SackLM AI",
  description: "Productivity powered by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased p-5`}
          cz-shortcut-listen="false"
        >
          <header className="flex justify-between items-center p-4 gap-4 h-16 border-b border-gray-300">
            <div>
              <Link href="/">
                <p className="text-4xl text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-[700] cursor-pointer">SackLM</p>
              </Link>
              
            </div>
            <div>
              <SignedOut>
                <div className="gap-3 flex">
                  <SignInButton />
                  <SignUpButton />
                </div>
              </SignedOut>
              <SignedIn>
                <div className="gap-3 flex">

                  <Link href={"/"}>
                    <p className="text-gray-400 font-bold hover:text-black transition-all duration-200 cursor-pointer text-lg">Home</p>
                  </Link>
                  {/* <Link href="/organize">
                    <p className="text-gray-400 font-bold hover:text-black transition-all duration-200 cursor-pointer text-lg">Organize</p>
                  </Link> */}
                  <Link href="/chats">
                    <p className="text-gray-400 font-bold hover:text-black transition-all duration-200 cursor-pointer text-lg">Chats</p>
                  </Link>
                  <Link href="/documents">
                    <p className="text-gray-400 font-bold hover:text-black transition-all duration-200 cursor-pointer text-lg">Documents</p>
                  </Link>
                  <Link href="/models">
                    <p className="text-gray-400 font-bold hover:text-black transition-all duration-200 cursor-pointer text-lg">Models</p>
                  </Link>
                  <Link href="/quick-tools">
                    <p className="text-gray-400 font-bold hover:text-black transition-all duration-200 cursor-pointer text-lg">Quick Tools</p>
                  </Link>

                  <UserButton userProfileUrl="/user-profile" userProfileMode="navigation" />


                </div>
              </SignedIn>
            </div>
          </header>
          <div className="mt-4">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
