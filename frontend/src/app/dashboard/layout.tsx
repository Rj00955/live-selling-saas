
"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const navItems: NavItem[] = [
  {
    label: "Vue d'ensemble",
    href: "/dashboard",
    icon: "grid",
  },
  {
    label: "Live Selling",
    href: "/dashboard/live-selling",
    icon: "video",
  },
  {
    label: "Commandes",
    href: "/dashboard/orders",
    icon: "orders",
  },
  {
    label: "Produits & Stock",
    href: "/dashboard/products",
    icon: "products",
  },
  {
    label: "Clients",
    href: "/dashboard/customers",
    icon: "users",
  },
  {
    label: "Paramètres",
    href: "/dashboard/settings",
    icon: "settings",
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Vue d'ensemble",
  "/dashboard/live-selling": "Live Selling",
  "/dashboard/orders": "Commandes",
  "/dashboard/products": "Produits & Stock",
  "/dashboard/customers": "Clients",
  "/dashboard/settings": "Paramètres",
};

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "video":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="13" height="14" rx="2" />
          <path d="m16 10 5-3v10l-5-3" />
        </svg>
      );

    case "orders":
      return (
        <svg {...common}>
          <path d="M8 6h13M8 12h13M8 18h13" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );

    case "products":
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5Z" />
          <path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8" />
          <path d="M12 13v9" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="10" cy="7" r="4" />
          <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 1.8Z" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );

    case "close":
      return (
        <svg {...common}>
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      );

    default:
      return null;
  }
}

function Sidebar({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <aside className="flex h-full w-[250px] shrink-0 flex-col bg-[#202923] text-white">
      <div className="flex h-[82px] items-center gap-3 border-b border-white/10 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#405C49] text-lg font-bold">
          T
        </div>

        <div>
          <p className="text-lg font-bold tracking-wide">Tiako Live</p>
          <p className="text-xs text-white/50">Gestion des ventes</p>
        </div>
      </div>

      <div className="px-5 pt-8">
        <p className="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
          Menu principal
        </p>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors ${
                  active
                    ? "bg-[#405C49] font-semibold text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon name={item.icon} size={19} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto border-t border-white/10 p-5">
        <div className="rounded-xl bg-white/5 p-4">
          <p className="text-sm font-medium">Tiako dia Tiako</p>
          <p className="mt-1 text-xs leading-5 text-white/45">
            Plateforme de vente en direct
          </p>
        </div>

        <p className="mt-5 text-center text-[10px] text-white/30">
          Tiako Live · Version 1.0
        </p>
      </div>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const title = pageTitles[pathname] ?? "Tiako Live";

  return (
    <div className="min-h-screen bg-[#F5F6F4]">
      {/* Sidebar desktop */}
      <div className="fixed inset-y-0 left-0 z-30 hidden lg:block">
        <Sidebar pathname={pathname} />
      </div>

      {/* Sidebar mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />

          <div className="relative z-10 h-full w-[270px] max-w-[85vw]">
            <div className="absolute right-3 top-3 z-20">
              <button
                type="button"
                aria-label="Fermer le menu"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg p-2 text-white hover:bg-white/10"
              >
                <Icon name="close" />
              </button>
            </div>

            <Sidebar
              pathname={pathname}
              onNavigate={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="min-h-screen lg:ml-[250px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-[#E5E9E4] bg-white px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Ouvrir le menu"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-[#405C49] transition-colors hover:bg-[#F0F3EF] lg:hidden"
            >
              <Icon name="menu" size={22} />
            </button>

            <div>
              <h1 className="text-lg font-semibold text-[#252B27]">
                {title}
              </h1>
              <p className="hidden text-xs text-[#7B857D] sm:block">
                Bienvenue sur votre espace de gestion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-[#252B27]">
                Espace vendeur
              </p>
              <p className="text-xs text-[#7B857D]">Tiako Live</p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCE9DF] text-sm font-bold text-[#405C49]">
              TL
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] p-5 sm:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
