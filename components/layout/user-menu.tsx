"use client";

import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import {
  ACCOUNT_NAV,
  WORKSPACE_NAV,
  canListProperty,
  filterNavForUser,
  getDefaultDashboard,
} from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const triggerClass =
  "inline-flex h-11 max-w-[12rem] shrink-0 items-center gap-2 rounded-[10px] border border-slate-200/80 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";

export function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function close() {
    setOpen(false);
    onNavigate?.();
  }

  if (!user) {
    return (
      <Link
        href="/auth"
        className="inline-flex h-11 shrink-0 items-center rounded-[10px] px-3.5 text-[15px] font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
        onClick={onNavigate}
      >
        Sign in
      </Link>
    );
  }

  const defaultDashboard = getDefaultDashboard(user);
  const dashboards = filterNavForUser(WORKSPACE_NAV, user).filter((item) => item.href !== defaultDashboard);
  const accountLinks = filterNavForUser(ACCOUNT_NAV, user);
  const firstName = user.name.split(" ")[0] ?? "Account";

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
        className={triggerClass}
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
          {firstName.charAt(0).toUpperCase()}
        </span>
        <span className="truncate">{firstName}</span>
        <ChevronDown className={cn("size-4 shrink-0 transition", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-xl border border-slate-200/80 bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"
          role="menu"
        >
          <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-ink dark:text-white">{user.name}</p>
            <p className="truncate text-xs text-slate-500">{user.email}</p>
          </div>

          <Link
            href={defaultDashboard}
            role="menuitem"
            onClick={close}
            className="mt-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
          >
            <LayoutDashboard className="size-4" />
            My dashboard
          </Link>

          {dashboards.length > 0 && (
            <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Workspaces</p>
              {dashboards.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={close}
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-1 border-t border-slate-100 pt-1 dark:border-slate-800">
            {accountLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={close}
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              void signOut();
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Compact sign-in link for mobile drawer when logged in — goes to account hub, not auth form. */
export function AccountHubLink({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useApp();
  if (!user) {
    return (
      <Link href="/auth" className="rounded-[10px] px-4 py-3 text-[15px] font-medium text-slate-700 dark:text-slate-200" onClick={onNavigate}>
        Sign in
      </Link>
    );
  }
  return (
    <Link
      href={getDefaultDashboard(user)}
      className="inline-flex items-center gap-2 rounded-[10px] px-4 py-3 text-[15px] font-medium text-slate-700 dark:text-slate-200"
      onClick={onNavigate}
    >
      <User className="size-4" />
      {user.name}
    </Link>
  );
}

export { canListProperty };
