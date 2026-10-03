"use client";

import {
  SignInButton,
  SignUpButton,
  useAuth,
} from "@clerk/nextjs";

import { useEffect } from "react";

export default function HomePage() {
  const {
    isLoaded,
    isSignedIn,
  } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      window.location.href = "/lobby";
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0]">
        <div className="text-sm font-semibold text-[#6d6d68]">
          Loading Align It...
        </div>
      </main>
    );
  }

  if (isSignedIn) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0]">
        <div className="text-sm font-semibold text-[#6d6d68]">
          Entering the lobby...
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f5f0] px-5">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#315c46] text-xl font-black text-white">
          AI
        </div>

        <p className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-[#a97922]">
          Align It
        </p>

        <h1 className="text-5xl font-black tracking-tight text-[#151515]">
          Morabaraba.
          <br />
          Connect.
          <br />
          Strategize.
          <br />
          Conquer.
        </h1>

        <p className="mx-auto mt-5 max-w-md text-sm leading-6 text-[#6d6d68]">
          A competitive Morabaraba platform built
          for players who want to connect, think
          ahead and master the board.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <SignInButton mode="modal">
            <button
              type="button"
              className="rounded-xl bg-[#315c46] px-6 py-3 font-bold text-white transition hover:bg-[#274b39]"
            >
              Sign in
            </button>
          </SignInButton>

          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-xl border border-[#dcdcd5] bg-white px-6 py-3 font-bold text-[#151515] transition hover:bg-[#eeeeea]"
            >
              Create account
            </button>
          </SignUpButton>
        </div>
      </div>
    </main>
  );
}