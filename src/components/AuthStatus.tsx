"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

export default function AuthStatus() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });

    // Subscribe to auth state changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    unsubscribe = () => {
      listener.subscription.unsubscribe();
    };

    return () => {
      unsubscribe?.();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (email) {
    return (
      <div className="w-full flex items-center justify-between p-4 rounded-lg border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur">
        <div className="text-sm">
          Signed in as <span className="font-medium">{email}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="w-full flex items-center justify-between p-4 rounded-lg border border-black/10 dark:border-white/10 bg-white/50 dark:bg-black/20 backdrop-blur">
      <div className="text-sm">You are not signed in.</div>
      <Link
        href="/auth/login"
        className="text-sm px-3 py-1.5 rounded-md border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
      >
        Sign in
      </Link>
    </div>
  );
}
