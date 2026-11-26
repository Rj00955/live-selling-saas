"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "../lib/api";
import { useAuth } from "./auth-provider";

interface Metric {
  total: number;
  trend: number | null;
}

interface Stats {
  periodDays: number;
  orders: Metric;
  customers: Metric;
  revenue: Metric;
}

interface StatsResponse {
  success?: boolean;
  stats?: Stats;
  message?: string;
}

const numberFormat = new Intl.NumberFormat("fr-FR");

function TrendLabel({ value, days }: { value: number | null; days: number }) {
  if (value === null) {
    return (
      <p className="mt-2 text-xs text-[#7B857D]">
        Pas de période précédente à comparer
      </p>
    );
  }

  const color =
    value > 0
      ? "text-emerald-600"
      : value < 0
        ? "text-red-600"
        : "text-[#7B857D]";
  const arrow = value > 0 ? "↑" : value < 0 ? "↓" : "→";
  const sign = value > 0 ? "+" : "";

  return (
    <p className={`mt-2 text-xs font-medium ${color}`}>
      {arrow} {sign}
      {value} %{" "}
      <span className="font-normal text-[#7B857D]">
        vs {days} jours précédents
      </span>
    </p>
  );
}

function AdminStatsCards() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      try {
        const response = await apiFetch(`${API_URL}/stats`);
        const data: StatsResponse = await response.json();

        if (!response.ok || !data.stats) {
          throw new Error(
            data.message ?? "Impossible de charger les statistiques."
          );
        }

        if (!cancelled) {
          setStats(data.stats);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les statistiques."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadStats();

    return () => {
      cancelled = true;
    };
  }, []);

  const cards = stats
    ? [
        {
          label: "Commandes",
          value: numberFormat.format(stats.orders.total),
          metric: stats.orders,
          icon: "🛒",
          tile: "bg-purple-100",
        },
        {
          label: "Clients",
          value: numberFormat.format(stats.customers.total),
          metric: stats.customers,
          icon: "👥",
          tile: "bg-blue-100",
        },
        {
          label: "Revenus",
          value: `${numberFormat.format(stats.revenue.total)} Ar`,
          metric: stats.revenue,
          icon: "💰",
          tile: "bg-emerald-100",
        },
      ]
    : [];

  return (
    <section>
      <h3 className="mb-4 text-lg font-semibold text-[#252B27]">
        Statistiques
      </h3>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5 text-sm text-[#7B857D]">
          Chargement des statistiques...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-[#E5E9E4] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-xl text-xl ${card.tile}`}
                  >
                    {card.icon}
                  </span>
                  <div>
                    <p className="text-sm text-[#7B857D]">{card.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-[#252B27]">
                      {card.value}
                    </p>
                  </div>
                </div>
                <TrendLabel
                  value={card.metric.trend}
                  days={stats?.periodDays ?? 7}
                />
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-[#7B857D]">
            Commandes non annulées. Revenus : commandes payées, regroupées
            par date de commande.
          </p>
        </>
      )}
    </section>
  );
}

// Visible uniquement pour l'administrateur. Le backend refuse de toute façon
// la route /stats aux autres rôles.
export function AdminStats() {
  const { user } = useAuth();

  if (user.role !== "ADMIN") return null;

  return <AdminStatsCards />;
}