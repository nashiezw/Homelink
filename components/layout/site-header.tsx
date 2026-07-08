"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Heart, Menu, Moon, Sun, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { HomeLinkLogoLink } from "@/components/brand/homelink-logo";
import { useAcademyDestination } from "@/components/academy/use-academy-destination";
import { useApp } from "@/components/providers/app-provider";
import { usePlatformConfig } from "@/components/providers/platform-config-provider";
import { AccountHubLink, UserMenu, canListProperty } from "@/components/layout/user-menu";
import { ACCOUNT_NAV, OWNER_NAV, filterNavForUser } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const exploreNavPrimary = [
  { label: "Rent", href: "/search?intent=rent", feature: null },
  { label: "Buy", href: "/search?intent=buy", feature: null },
  { label: "Roommates", href: "/roommates", feature: "roommateMatching" as const },
  { label: "Academy", href: "/academy", feature: null, smartAcademy: true },
] as const;

const exploreNavMore = [
  { label: "Calculators", href: "/calculators", feature: null, description: "Move-in costs, rent budgets, commissions" },
  { label: "Holiday Homes", href: "/search?type=holiday_home", feature: null, description: "Short-stay and holiday rentals" },
  { label: "Land", href: "/search?type=land", feature: null, description: "Plots and development land" },
  { label: "Commercial", href: "/search?type=commercial", feature: null, description: "Offices, retail, and business space" },
] as const;

const exploreNavBase = [...exploreNavPrimary, ...exploreNavMore.map(({ description: _d, ...item }) => item)];

const iconButtonClass =
  "relative inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white";

function useNavActive() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return useCallback(
    (href: string) => {
      const [path, queryString] = href.split("?");
      if (pathname !== path) {
        if (path === "/roommates" && pathname.startsWith("/roommates")) return true;
        if (path === "/become-agent" && pathname.startsWith("/become-agent")) return true;
        if (path === "/academy" && pathname.startsWith("/dashboard/academy")) return true;
        if (path === "/calculators" && pathname.startsWith("/calculators")) return true;
        return false;
      }
      if (!queryString) return true;
      const expected = new URLSearchParams(queryString);
      for (const [key, value] of expected.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    },
    [pathname, searchParams],
  );
}

function NavLink({
  href,
  children,
  active,
  onClick,
  title,
}: {
  href: string;
  children: React.ReactNode;
  active: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={title}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center whitespace-nowrap rounded-[10px] px-2.5 text-sm font-medium tracking-tight transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
        active
          ? "bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80 dark:hover:text-white",
      )}
    >
      {children}
    </Link>
  );
}

export function SiteHeader() {
  const { user, signOut, favourites, compareIds } = useApp();
  const { href: academyHref } = useAcademyDestination();
  const { config: _config, isFeatureEnabled } = usePlatformConfig();
  const exploreNav = exploreNavBase
    .filter((item) => !item.feature || isFeatureEnabled(item.feature))
    .map((item) => ("smartAcademy" in item && item.smartAcademy ? { ...item, href: academyHref } : item));
  const primaryNav = exploreNavPrimary
    .filter((item) => !item.feature || isFeatureEnabled(item.feature))
    .map((item) => ("smartAcademy" in item && item.smartAcademy ? { ...item, href: academyHref } : item));
  const moreNav = exploreNavMore.filter((item) => !item.feature || isFeatureEnabled(item.feature));
  const isNavActive = useNavActive();
  const [menuOpen, setMenuOpen] = useState(false);
  const [ownersOpen, setOwnersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const ownerLinks = filterNavForUser(OWNER_NAV, user);
  const accountLinks = filterNavForUser(ACCOUNT_NAV, user);
  const ownersActive = ownerLinks.some((item) => isNavActive(item.href));
  const moreActive = moreNav.some((item) => isNavActive(item.href));
  const listHref = canListProperty(user)
    ? "/dashboard/landlord/new"
    : `/auth?next=${encodeURIComponent("/dashboard/landlord/new")}`;

  useEffect(() => {
    const stored = window.localStorage.getItem("homelink_theme");
    const prefersDark = stored === "dark";
    setDark(prefersDark);
    document.documentElement.classList.toggle("dark", prefersDark);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 6);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOwnersOpen(false);
      }
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    window.localStorage.setItem("homelink_theme", next ? "dark" : "light");
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-white transition-[box-shadow,border-color,background-color] duration-200 dark:bg-slate-950",
        scrolled
          ? "border-slate-200/80 bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950 lg:bg-white/90 lg:backdrop-blur-xl lg:dark:bg-slate-950/90"
          : "border-transparent bg-white dark:bg-slate-950 lg:bg-white/80 lg:backdrop-blur-md lg:dark:bg-slate-950/80",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8 xl:gap-4 xl:px-10">
        <HomeLinkLogoLink variant="nav" className="relative z-10 shrink-0" />

        {/* Primary navigation — xl+ only; overflow links live under More */}
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex"
          aria-label="Main navigation"
        >
          {primaryNav.map((item) => (
            <NavLink key={item.href} href={item.href} active={isNavActive(item.href)}>
              {item.label}
            </NavLink>
          ))}

          {moreNav.length > 0 && (
            <div className="relative shrink-0" ref={moreDropdownRef}>
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => {
                  setMoreOpen((open) => !open);
                  setOwnersOpen(false);
                }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] px-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                  moreActive || moreOpen
                    ? "bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80",
                )}
              >
                More
                <ChevronDown className={cn("size-4 transition-transform duration-200", moreOpen && "rotate-180")} />
              </button>
              {moreOpen && (
                <div
                  className="absolute left-1/2 top-[calc(100%+0.5rem)] z-50 w-72 -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"
                  role="menu"
                >
                  {moreNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setMoreOpen(false)}
                      className={cn(
                        "block rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-emerald-50 dark:hover:bg-slate-800",
                        isNavActive(item.href) && "bg-emerald-50 dark:bg-emerald-950/40",
                      )}
                    >
                      <p className="text-sm font-semibold text-ink dark:text-white">{item.label}</p>
                      {"description" in item && item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {ownerLinks.length > 0 && (
            <div className="relative shrink-0" ref={dropdownRef}>
              <button
                type="button"
                aria-expanded={ownersOpen}
                aria-haspopup="true"
                onClick={() => {
                  setOwnersOpen((open) => !open);
                  setMoreOpen(false);
                }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1 whitespace-nowrap rounded-[10px] px-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600",
                  ownersActive || ownersOpen
                    ? "bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800/80",
                )}
              >
                For Owners
                <ChevronDown className={cn("size-4 transition-transform duration-200", ownersOpen && "rotate-180")} />
              </button>
              {ownersOpen && (
                <div
                  className="absolute left-1/2 top-[calc(100%+0.5rem)] z-50 w-72 -translate-x-1/2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-[0_16px_40px_-12px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900"
                  role="menu"
                >
                  {ownerLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      role="menuitem"
                      onClick={() => setOwnersOpen(false)}
                      className="block rounded-lg px-3 py-2.5 transition-colors duration-200 hover:bg-emerald-50 dark:hover:bg-slate-800"
                    >
                      <p className="text-sm font-semibold text-ink dark:text-white">{item.label}</p>
                      {item.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Utilities + account */}
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          <button type="button" onClick={toggleTheme} className={iconButtonClass} aria-label="Toggle dark mode">
            {dark ? <Sun className="size-5" strokeWidth={1.75} /> : <Moon className="size-5" strokeWidth={1.75} />}
          </button>

          <Link
            href="/saved"
            className={iconButtonClass}
            aria-label={favourites.length ? `Saved properties, ${favourites.length} items` : "Saved properties"}
          >
            <Heart className="size-5" strokeWidth={1.75} />
            {favourites.length > 0 && (
              <span className="absolute right-1 top-1 flex size-[18px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
                {favourites.length > 9 ? "9+" : favourites.length}
              </span>
            )}
          </Link>

          <div className="hidden sm:block">
            <UserMenu />
          </div>

          <Link
            href={listHref}
            className="hidden h-10 items-center justify-center rounded-[10px] bg-gradient-to-b from-emerald-600 to-emerald-700 px-4 text-sm font-bold text-white shadow-[0_4px_16px_-2px_rgba(5,150,105,0.45)] transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-emerald-600 sm:inline-flex"
          >
            List property
          </Link>

          <button
            type="button"
            className={cn(iconButtonClass, "xl:hidden")}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {/* Mobile / tablet drawer */}
      <div
        className={cn("fixed inset-0 z-[100] h-[100dvh] xl:hidden", menuOpen ? "pointer-events-auto" : "hidden pointer-events-none")}
        aria-hidden={!menuOpen}
      >
        <div
          className={cn(
            "fixed inset-0 h-[100dvh] bg-slate-900/45 backdrop-blur-[2px] transition-opacity duration-300",
            menuOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMenuOpen(false)}
        />
        <div
          className={cn(
            "fixed bottom-0 right-0 top-0 flex h-[100dvh] w-[min(100%,22rem)] max-w-full flex-col overflow-hidden bg-white shadow-2xl transition-transform duration-300 ease-out dark:bg-slate-950",
            menuOpen ? "translate-x-0" : "translate-x-full",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 dark:border-slate-800">
            <HomeLinkLogoLink variant="nav" onClick={() => setMenuOpen(false)} />
            <button type="button" className={iconButtonClass} aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <X className="size-5" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-3 py-4 dark:bg-slate-950" aria-label="Mobile navigation">
            <div className="grid gap-0.5">
              {primaryNav.map((item) => (
                <NavLink key={item.href} href={item.href} active={isNavActive(item.href)} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
            </div>

            {moreNav.length > 0 && (
              <>
                <p className="mb-2 mt-5 px-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">More</p>
                <div className="grid gap-0.5">
                  {moreNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "rounded-[10px] px-2.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200",
                        isNavActive(item.href) && "bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
                      )}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}

            {ownerLinks.length > 0 && (
              <>
                <p className="mb-2 mt-5 px-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">For Owners</p>
                <div className="grid gap-0.5">
                  {ownerLinks.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-[10px] px-2.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 grid gap-0.5 border-t border-slate-100 pt-4 dark:border-slate-800">
              <AccountHubLink onNavigate={() => setMenuOpen(false)} />
              {user &&
                accountLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-[10px] px-2.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200"
                  >
                    {item.label}
                  </Link>
                ))}
              {isFeatureEnabled("compareListings") && compareIds.length > 0 && (
                <Link href="/compare" onClick={() => setMenuOpen(false)} className="rounded-[10px] px-2.5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                  Compare ({compareIds.length})
                </Link>
              )}
              {user && (
                <button
                  type="button"
                  className="rounded-[10px] px-2.5 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-200"
                  onClick={() => {
                    setMenuOpen(false);
                    void signOut();
                  }}
                >
                  Sign out
                </button>
              )}
            </div>

            <Link
              href={listHref}
              onClick={() => setMenuOpen(false)}
              className="mt-5 flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-b from-emerald-600 to-emerald-700 text-sm font-bold text-white"
            >
              List property
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
