"use client";

import Link from "next/link";

export default function PendingPage() {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
        <svg
          className="h-6 w-6 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <h1 className="text-xl font-semibold text-zinc-900">Account Pending Approval</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Your registration has been received. An administrator will review and approve your account shortly.
      </p>
      <p className="mt-4 text-sm text-zinc-500">
        You will be able to log in once your account is approved.
      </p>

      <div className="mt-6">
        <Link
          href="/login"
          className="inline-block rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}
