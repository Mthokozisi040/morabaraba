"use client";

import {
  Bell,
  Gamepad2,
  Home,
  Search,
  Trophy,
  Users,
} from "lucide-react";

import Link from "next/link";

import {
  UserButton,
} from "@clerk/nextjs";

export default function AlignItShell({
  children,
}) {
  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#151515]">
      <header className="sticky top-0 z-50 border-b border-[#e5e5df] bg-[#f5f5f0]/95 backdrop-blur">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/lobby"
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#315c46] text-lg font-black text-white">
              AI
            </div>

            <div>
              <div className="text-lg font-black tracking-tight">
                Align It
              </div>

              <div className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-[#6d6d68] sm:block">
                Morabaraba
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <NavItem
              href="/lobby"
              icon={Home}
              label="Lobby"
            />

            <NavItem
              href="/play"
              icon={Gamepad2}
              label="Play"
            />

            <NavItem
              href="/players"
              icon={Users}
              label="Players"
            />

            <NavItem
              href="/leaderboards"
              icon={Trophy}
              label="Rankings"
            />
          </nav>

          <div className="flex items-center gap-3">
            <button className="rounded-xl p-2.5 text-[#6d6d68] transition hover:bg-white hover:text-[#151515]">
              <Bell size={19} />
            </button>

            <UserButton />
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-[#6d6d68] transition hover:bg-white hover:text-[#151515]"
    >
      <Icon size={17} />
      {label}
    </Link>
  );
}