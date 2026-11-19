
"use client";

import { useCallback, useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface Order {
  id: string;
  status: string;
  quantity: number;
  customerFbId: string;
  customerName?: string | null;
  createdAt: string;
  product?: {
    code: string;
    name: string;
    price: number;
  } | null;
}

interface OrdersResponse {
  success: boolean;
  count: number;
  orders: Order[];
  message?: string;
}

const filters = [
  { value: "ALL", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "CONFIRMED", label: "Confirmées" },
  { value: "PAID", label: "Payées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("ALL");

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/orders`);
      const data: OrdersResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Impossible de charger les commandes."
        );
      }

      setOrders(data.orders ?? []);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setLoading(false);
    }
  }, []);

 useEffect(() => {
  let cancelled = false;

  async function loadOrders() {
    try {
      const response = await fetch(`${API_URL}/orders`);
      const data: OrdersResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? "Impossible de charger les commandes."
        );
      }

      if (!cancelled) {
        setOrders(data.orders ?? []);
        setError("");
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  void loadOrders();

  return () => {
    cancelled = true;
  };
}, []);

  const updateOrder = async (
    order: Order,
    action: "confirm" | "cancel"
  ) => {
    const actionLabel =
      action === "confirm" ? "confirmer" : "annuler";

    if (
      !window.confirm(
        `Veux-tu vraiment ${actionLabel} cette commande ?`
      )
    ) {
      return;
    }

    setProcessingId(order.id);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `${API_URL}/orders/${order.id}/${action}`,
        { method: "PATCH" }
      );

      const data = await response.json();

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message ?? `Impossible de ${actionLabel} la commande.`
        );
      }

      setSuccess(
        action === "confirm"
          ? "Commande confirmée avec succès."
          : "Commande annulée avec succès. Le stock a été restauré si nécessaire."
      );

      await fetchOrders();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR").format(price) + " Ar";

  const formatDate = (date: string) => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date inconnue";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsedDate);
  };

  const getStatus = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return {
          label: "En attente",
          className: "bg-amber-100 text-amber-700",
        };
      case "CONFIRMED":
        return {
          label: "Confirmée",
          className: "bg-green-100 text-green-800",
        };
      case "PAID":
        return {
          label: "Payée",
          className: "bg-blue-100 text-blue-700",
        };
      case "CANCELLED":
        return {
          label: "Annulée",
          className: "bg-red-100 text-red-700",
        };
      default:
        return {
          label: status,
          className: "bg-gray-100 text-gray-700",
        };
    }
  };

  const pendingCount = orders.filter(
    (order) => order.status.toUpperCase() === "PENDING"
  ).length;

  const confirmedCount = orders.filter(
    (order) => order.status.toUpperCase() === "CONFIRMED"
  ).length;

  const paidCount = orders.filter(
    (order) => order.status.toUpperCase() === "PAID"
  ).length;

  const cancelledCount = orders.filter(
    (order) => order.status.toUpperCase() === "CANCELLED"
  ).length;

  const filteredOrders =
    filter === "ALL"
      ? orders
      : orders.filter(
          (order) => order.status.toUpperCase() === filter
        );

  const totalConfirmed = orders
    .filter((order) =>
      ["CONFIRMED", "PAID"].includes(order.status.toUpperCase())
    )
    .reduce(
      (total, order) =>
        total +
        Number(order.product?.price ?? 0) *
          Number(order.quantity ?? 0),
      0
    );

  return (
    <div className="space-y-7">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-[#7B857D]">Ventes</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#252B27]">
            Gestion des commandes
          </h1>
          <p className="mt-2 text-sm text-[#7B857D]">
            Consulte et gère les commandes de tes clients.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchOrders()}
          disabled={loading}
          className="rounded-xl border border-[#E5E9E4] bg-white px-5 py-3 text-sm font-medium text-[#405C49] transition hover:bg-[#F5F6F4] disabled:opacity-50"
        >
          ↻ Actualiser
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Statistiques */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Total commandes</p>
          <p className="mt-3 text-2xl font-semibold text-[#252B27]">
            {loading ? "—" : orders.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">En attente</p>
          <p className="mt-3 text-2xl font-semibold text-amber-600">
            {loading ? "—" : pendingCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Confirmées</p>
          <p className="mt-3 text-2xl font-semibold text-green-700">
            {loading ? "—" : confirmedCount}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Montant confirmé et payé</p>
          <p className="mt-3 text-xl font-semibold text-[#252B27]">
            {loading ? "—" : formatPrice(totalConfirmed)}
          </p>
        </div>
      </section>

      {/* Liste des commandes */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E9E4] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#E5E9E4] px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#252B27]">
              Liste des commandes
            </h2>
            <p className="mt-1 text-sm text-[#7B857D]">
              {filteredOrders.length} commande(s) affichée(s)
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                type="button"
                key={item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                  filter === item.value
                    ? "bg-[#405C49] text-white"
                    : "border border-[#E5E9E4] text-[#7B857D] hover:bg-[#F5F6F4]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[#7B857D]">
            Chargement des commandes...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl text-[#7B857D]">▤</div>
            <p className="mt-3 font-medium text-[#252B27]">
              Aucune commande trouvée
            </p>
            <p className="mt-1 text-sm text-[#7B857D]">
              Les commandes correspondant à ce filtre apparaîtront ici.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left">
              <thead className="bg-[#F8F9F7] text-xs uppercase tracking-wide text-[#7B857D]">
                <tr>
                  <th className="px-6 py-4 font-medium">Commande</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Produit</th>
                  <th className="px-6 py-4 font-medium">Quantité</th>
                  <th className="px-6 py-4 font-medium">Montant</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Statut</th>
                  <th className="px-6 py-4 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E9E4]">
                {filteredOrders.map((order) => {
                  const status = getStatus(order.status);
                  const pending =
                    order.status.toUpperCase() === "PENDING";

                  const amount =
                    Number(order.product?.price ?? 0) *
                    Number(order.quantity ?? 0);

                  return (
                    <tr
                      key={order.id}
                      className="transition hover:bg-[#FAFBF9]"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-[#252B27]">
                          #{order.id.slice(0, 8)}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#252B27]">
                          {order.customerName || "Client Facebook"}
                        </p>
                        <p className="mt-1 text-xs text-[#7B857D]">
                          {order.customerFbId}
                        </p>
                      </td>

                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-[#252B27]">
                          {order.product?.name ?? "Produit inconnu"}
                        </p>
                        <p className="mt-1 text-xs text-[#7B857D]">
                          Code : {order.product?.code ?? "—"}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-sm text-[#252B27]">
                        {order.quantity}
                      </td>

                      <td className="px-6 py-4 text-sm font-medium text-[#252B27]">
                        {formatPrice(amount)}
                      </td>

                      <td className="px-6 py-4 text-xs text-[#7B857D]">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {pending ? (
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void updateOrder(order, "confirm")
                              }
                              disabled={processingId === order.id}
                              className="rounded-lg bg-[#405C49] px-3 py-2 text-xs font-medium text-white hover:bg-[#314938] disabled:opacity-50"
                            >
                              {processingId === order.id
                                ? "..."
                                : "Confirmer"}
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void updateOrder(order, "cancel")
                              }
                              disabled={processingId === order.id}
                              className="rounded-lg border border-red-100 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <div className="text-right text-xs text-[#7B857D]">
                            Aucune action
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs leading-relaxed text-[#7B857D]">
        {cancelledCount} commande(s) annulée(s) et {paidCount} commande(s)
        payée(s). La confirmation et l&apos;annulation sont réservées aux
        commandes en attente.
      </p>
    </div>
  );
}
