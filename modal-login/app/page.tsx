"use client";
import {
  alchemy,
  createAlchemySmartAccountClient,
  gensynTestnet,
} from "@account-kit/infra";
import {
  useAuthModal,
  useLogout,
  useSigner,
  useSignerStatus,
  useUser,
} from "@account-kit/react";
import {
  createModularAccountV2,
  createModularAccountV2Client,
} from "@account-kit/smart-contracts";
import {
  buildDeferredActionDigest,
  PermissionType,
} from "@account-kit/smart-contracts/experimental";
import {
  deferralActions,
  installValidationActions,
  PermissionBuilder,
} from "@account-kit/smart-contracts/experimental";
import { useCallback, useEffect, useState } from "react";

const DAY_IN_MILLISECONDS = 1000 * 60 * 60 * 24;

export default function Home() {
  const user = useUser();
  const { openAuthModal } = useAuthModal();
  const signerStatus = useSignerStatus();
  const { logout } = useLogout();
  const signer = useSigner();

  const [createdApiKey, setCreatedApiKey] = useState(false);
  const [sawDisconnected, setSawDisconnected] = useState(false);
  const [sawConnected, setSawConnected] = useState(false);

  // For some reason, the signer status jumps from disconnected to initializing,
  // which makes keeping track of the status here tricky.
  // Record that we ever saw a disconnected or connected status and make decisions on that.
  useEffect(() => {
    if (signerStatus.status === "DISCONNECTED") {
      setSawDisconnected(true);
    }
    if (signerStatus.status === "CONNECTED") {
      setSawConnected(true);
    }
  }, [signerStatus.status]);

  const handleAll = useCallback(async () => {
    if (!user || !signer) {
      console.log("handleAll: no user or signer");
      return;
    }

    try {
      const whoamiStamp = await signer?.inner.stampWhoami();
      if (!whoamiStamp) {
        console.log("No whoami stamp");
        return;
      }

      const resp = await fetch("/api/get-api-key", {
        method: "POST",
        body: JSON.stringify({ whoamiStamp }),
      });

      const { publicKey } = (await resp.json()) || {};
      if (!publicKey) {
        console.log("No public key");
        return;
      }

      const transport = alchemy({
        apiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY!,
      });

      const account = await createModularAccountV2({
        transport,
        chain: gensynTestnet,
        signer,
      });

      const initCode = await account.getInitCode();

      const client = (
        await createModularAccountV2Client({
          signer,
          signerEntity: account.signerEntity,
          accountAddress: account.address,
          transport,
          chain: gensynTestnet,
        })
      )
        .extend(installValidationActions)
        .extend(deferralActions);

      const { entityId, nonce } = await client.getEntityIdAndNonce({
        // This must be true for the ROOT permission
        isGlobalValidation: true,
      });

      const { typedData, fullPreSignatureDeferredActionDigest } =
        await new PermissionBuilder({
          client,
          key: {
            publicKey,
            type: "secp256k1",
          },
          entityId,
          nonce,
          deadline: 62 * DAY_IN_MILLISECONDS,
        })
          .addPermission({
            permission: {
              type: PermissionType.ROOT,
            },
          })
          .compileDeferred();

      const deferredValidationSig =
        await client.account.signTypedData(typedData);

      const deferredActionDigest = buildDeferredActionDigest({
        fullPreSignatureDeferredActionDigest,
        sig: deferredValidationSig,
      });

      await fetch("/api/set-api-key-activated", {
        method: "POST",
        body: JSON.stringify({
          orgId: user.orgId,
          apiKey: publicKey,
          accountAddress: account.address,
          initCode,
          deferredActionDigest,
        }),
      });

      setCreatedApiKey(true);
    } catch (err) {
      console.error(err);
      window.alert("Error logging in. See console for details.");
    }
  }, [signer, user]);

  useEffect(() => {
    if (sawConnected) {
      handleAll();
    }
  }, [handleAll, sawConnected]);

  // Show alert if crypto.subtle isn't available.
  useEffect(() => {
    if (typeof window === undefined) {
      return;
    }
    try {
      if (typeof window.crypto.subtle !== "object") {
        throw new Error("window.crypto.subtle is not available");
      }
    } catch (err) {
      alert(
        "Crypto api is not available in browser. Please be sure that the app is being accessed via localhost or a secure connection.",
      );
    }
  }, []);

  const Login = () => {
    return (
      <>
        <div className="block mt-8">
          <p className="font-auxmono text-md text-black bg-gensyn-pink inline uppercase">
            Sign in to the Gensyn Testnet
          </p>
        </div>

        <div className="block">
            <button className="btn bg-gensyn-pink text-black px-8 py-4 uppercase font-auxmono" onClick={openAuthModal}>
              Sign in
            </button>
        </div>
      </>
    )
  }

  const Loading = () => {
    return (
      <h1 className="inline bg-gensyn-pink font-mondwest text-6xl text-black">Loading...</h1>
    )
  }

  const Logout = () => {
    return (
      <>
        <div className="block mt-8">
          <p className="font-auxmono text-md text-black bg-gensyn-pink inline uppercase">
            You are successfully logged in to the Gensyn Testnet.
          </p>
        </div>
        <div className="block">
            <button className="btn bg-gensyn-pink text-black px-8 py-4 uppercase font-auxmono" onClick={() => logout()}>
              Log out
            </button>
        </div>
      </>
    )
  }

  return (
    <main style={{ backgroundImage: "url('/images/login.png')" }} className="bg-cover bg-center h-screen w-screen flex items-end justify-start">
      <section className="px-16 pb-16">
        <img src="/images/logo.gif" alt="A spinning Gensyn logo" className="h-20" />

        <div className="block mt-8">
          <span className="mb-4 w-1/2 text-nowrap overflow-hidden block tracking-widest font-simplon text-md text-gensyn-pink uppercase">
            * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
          </span>
          <h1 className="inline bg-gensyn-pink font-mondwest text-6xl text-black">Welcome to the Gensyn Testnet</h1>
        </div>

        {(!sawDisconnected && !sawConnected) || (user && !createdApiKey) ? (
          <Loading />
        ) : user ? (
          <Logout />
        ) : (
          <Login />
        )}

        <span className="mt-4 w-1/2 text-nowrap overflow-hidden block tracking-widest font-simplon text-md text-gensyn-pink uppercase">
          * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
        </span>
      </section>
    </main>
  )
}