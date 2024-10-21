"use client";

import "@/styles/globals.css";
import { fontGeist, fontHeading, fontSans, fontUrban } from "@/assets/fonts";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ThirdwebProvider } from "@thirdweb-dev/react";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";
import { TailwindIndicator } from "@/components/tailwind-indicator";
import { env } from "@/env.mjs";
import { ODB } from "./context/OrbisContext";
import { WalletProvider } from "./context/WalletContext";
import { useState, useEffect } from "react";
import { initialize } from '@nucypher/taco';

interface RootLayoutProps {
  children: React.ReactNode;
}

export const useQueryClient = () => {
  const [queryClient] = useState(() => new QueryClient())
  return queryClient
}

export default function RootLayout({ children }: RootLayoutProps) {
  const queryClient = useQueryClient();
  useEffect(() => {
    initialize();
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable,
          fontUrban.variable,
          fontHeading.variable,
          fontGeist.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryClientProvider client={queryClient}>
            <WalletProvider>
              <ThirdwebProvider
                activeChain="ethereum"
                clientId={env.NEXT_PUBLIC_THIRDWEB_ID}
              >
                <ODB>{children}</ODB>
              </ThirdwebProvider>
            </WalletProvider>
          </QueryClientProvider>

          <Toaster richColors closeButton />
          <TailwindIndicator />
        </ThemeProvider>
      </body>
    </html>
  );
}
