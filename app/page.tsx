import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl flex-col items-center justify-center text-center">
        <h1 className="text-4xl font-bold md:text-6xl">
          LP45 Private Investment Club
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-slate-300">
          A private investment club platform for member registration, deposits,
          wallet management, investment participation, ROI tracking, and
          withdrawals.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-emerald-500 px-6 py-4 font-semibold text-slate-950 hover:bg-emerald-400"
          >
            Register as Member
          </Link>

          <Link
            href="/login"
            className="rounded-xl border border-white/10 px-6 py-4 font-semibold hover:bg-white/10"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}