"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState<string>("Signing you in...");

  useEffect(() => {
    const doExchange = async () => {
      try {
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setStatus("done");
          setMessage("Signed in. Redirecting...");
          // Small delay so users see the message
          setTimeout(() => router.replace("/"), 500);
          return;
        }

        // Fallback for email-link formats using token_hash (magiclink/signup/recovery/etc)
        if (tokenHash) {
          const allowed = new Set(["magiclink", "signup", "recovery", "invite", "email_change"]);
          const otpType = allowed.has((type ?? "") as any)
            ? (type as "magiclink" | "signup" | "recovery" | "invite" | "email_change")
            : "magiclink";
          const { error } = await supabase.auth.verifyOtp({
            type: otpType,
            token_hash: tokenHash,
          });
          if (error) throw error;
          setStatus("done");
          setMessage("Signed in. Redirecting...");
          setTimeout(() => router.replace("/"), 500);
          return;
        }

        // Fallback: handle implicit flow where tokens are in URL hash (e.g., #access_token=...)
        if (typeof window !== "undefined" && window.location.hash && window.location.hash.includes("access_token")) {
          const hash = window.location.hash.substring(1);
          const params = new URLSearchParams(hash);
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          if (!access_token || !refresh_token) throw new Error("Invalid auth redirect: missing tokens in URL hash.");
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          setStatus("done");
          setMessage("Signed in. Redirecting...");
          setTimeout(() => router.replace("/"), 500);
          return;
        }

        throw new Error("Missing code or token in URL. Open the magic link on the same device where you requested it.");
      } catch (err: any) {
        setStatus("error");
        setMessage(err?.message ?? "Failed to complete sign-in.");
      }
    };

    doExchange();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
        <h1 className="text-xl font-semibold mb-2">Auth Callback</h1>
        <p className="text-sm text-black/70 dark:text-white/70">{message}</p>
        {status === "error" && (
          <p className="mt-3 text-sm">
            You can try requesting a new link on the{" "}
            <a href="/auth/login" className="underline">
              sign-in page
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
