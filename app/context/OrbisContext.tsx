import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  OrbisDB,
  type OrbisConnectResult,
} from "@useorbis/db-sdk";
import type { Cacao } from '@didtools/cacao';
import { env } from "@/env.mjs";
import { OrbisEVMAuth } from "@useorbis/db-sdk/auth";
import { useWalletClient, useAccount, useAccountEffect } from "wagmi";

type OrbisDBProps = {
  children: ReactNode;
};

const ENV_ID = env.NEXT_PUBLIC_ENV_ID ?? "";

declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Configure Orbis Client & create context.
 */

const orbis = new OrbisDB({
  ceramic: {
    gateway: "https://ceramic-orbisdb-mainnet-direct.hirenodes.io/",
  },
  nodes: [
    {
      gateway: "https://studio.useorbis.com",
      env: ENV_ID,
    },
  ],
});

let isAuthenticated = false;

const Context = createContext({ orbis, isAuthenticated });

export const ODB = ({ children }: OrbisDBProps) => {
  function StartAuth() {
    const { data: walletClient } = useWalletClient();
    const [isAuth, setAuth] = useState(false);
    const { address } = useAccount();
    useAccountEffect({
      onDisconnect() {
        localStorage.removeItem("orbis:session");
      },
    });
    useEffect(() => {
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', () => {
          localStorage.clear();
          window.location.reload();
        });
      }

      const StartOrbisAuth = async (): Promise<
        OrbisConnectResult | undefined
      > => {
        const auth = new OrbisEVMAuth(window.ethereum);
        // Authenticate - this option persists the session in local storage
        const authResult: OrbisConnectResult = await orbis.connectUser({
          auth,
        });
        if (authResult.auth.session) {
          console.log("Orbis Auth'd:", authResult.auth.session);
          return authResult;
        }

        return;
      };

      // Only run this if the wallet client is available
      if (walletClient) {
        const address = walletClient.account.address;
        if (localStorage.getItem("orbis:session") && address) {
          const serializedAttestation = localStorage.getItem("orbis:session") ?? "";
          const {cacao} = JSON.parse(Buffer.from(serializedAttestation, "base64").toString()) as {cacao: Cacao};
          console.log("Parsed Session:", cacao);
          const expTime = cacao.p.exp;
          const attestationAddress = cacao.p.iss.replace("did:pkh:eip155:1:", "").toLowerCase();
          if (
            attestationAddress !==
            address.toLowerCase()
          ) {
            console.log("Address mismatch, removing session");
            localStorage.removeItem("orbis:session");
          }
          //@ts-expect-error - TS doesn't know about the expirationTime field
          else if (expTime > Date.now()) {
            localStorage.removeItem("orbis:session");
          } else {
            setAuth(true);
            isAuthenticated = true;
            window.dispatchEvent(new Event("loaded"));
          }
        }
        if (!isAuthenticated) {
          StartOrbisAuth().then((authResult) => {
            if (authResult) {
              setAuth(true);
              isAuthenticated = true;
              window.dispatchEvent(new Event("loaded"));
            }
          });
        }
        orbis.getConnectedUser().then((user) => {
          console.log("Connected User:", user);
        });
      }
    }, [isAuth, walletClient, address]);

    return isAuth;

  }
  if (!isAuthenticated) {
    StartAuth();
  }

  return (
    <Context.Provider value={{ orbis, isAuthenticated }}>
      {children}
    </Context.Provider>
  );
};

export const useODB = () => useContext(Context);
