import AuthStatus from "@/components/AuthStatus";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen p-6">
      <div className="w-full max-w-3xl mx-auto space-y-6">
        <AuthStatus />

        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
          <h1 className="text-2xl font-semibold mb-2">Finance Tutor</h1>
          <p className="text-black/70 dark:text-white/70">
            Learn finance concepts through interactive lessons and adaptive tutoring.
          </p>
        </div>

        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
          <h2 className="text-lg font-semibold mb-4">Available Lessons</h2>
          <div className="space-y-3">
            <Link
              href="/learn/tvm/history-of-money"
              className="block p-4 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">History of Money</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Explore the evolution of money from barter systems to modern currency
              </div>
            </Link>
            <Link
              href="/learn/tvm/time-value-money"
              className="block p-4 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">Time Value of Money</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Understand present value, future value, and the time value of money
              </div>
            </Link>
            <Link
              href="/learn/tvm/compounding-interest"
              className="block p-4 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">Compounding Interest</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Learn about the power of compound interest and its applications
              </div>
            </Link>
            <Link
              href="/learn/tvm/ledger-origins"
              className="block p-4 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">Ledger Origins</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Learn about early record-keeping systems and their importance
              </div>
            </Link>
            <Link
              href="/learn/tvm/early-banking"
              className="block p-4 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
            >
              <div className="font-medium">Early Banking</div>
              <div className="text-sm text-black/70 dark:text-white/70">
                Discover the origins of banking and financial institutions
              </div>
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-black/10 dark:border-white/10 p-6 bg-white/60 dark:bg-black/30 backdrop-blur">
          <h2 className="text-lg font-semibold mb-4">Admin</h2>
          <Link
            href="/admin"
            className="block p-4 rounded-lg border border-black/10 dark:border-white/15 hover:bg-black/5 dark:hover:bg-white/10 transition"
          >
            <div className="font-medium">Content Admin</div>
            <div className="text-sm text-black/70 dark:text-white/70">
              Review and manage pre-generated content for the tutor
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
