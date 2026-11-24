"use client";

import { useEffect, useState } from "react";
import { API_URL, apiFetch } from "../../../lib/api";

interface Customer {
  id: string;
  fbUserId: string;
  name: string | null;
  createdAt: string;
  _count: {
    orders: number;
    comments: number;
  };
}

interface CustomersResponse {
  success: boolean;
  count: number;
  customers: Customer[];
  message?: string;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

    useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      try {
        const response = await apiFetch(`${API_URL}/customers`);
        const data: CustomersResponse = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ?? "Impossible de charger les clients."
          );
        }

        if (!cancelled) {
          setCustomers(data.customers ?? []);
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger les clients."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[#252B27]">
          Clients
        </h2>
        <p className="mt-2 text-sm text-[#7B857D]">
          Consulte les clients qui passent commande pendant tes Live.
        </p>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-8 text-center text-sm text-[#7B857D]">
          Chargement des clients...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error}
        </div>
      ) : customers.length === 0 ? (
        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-8 text-center">
          <h3 className="text-base font-semibold text-[#252B27]">
            Aucun client pour le moment
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#7B857D]">
            Les clients apparaîtront ici lorsque les commentaires et les
            commandes seront enregistrés dans l&apos;application.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E5E9E4] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E5E9E4] text-xs uppercase tracking-wide text-[#7B857D]">
              <tr>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Identifiant Facebook</th>
                <th className="px-5 py-3 text-right font-medium">Commandes</th>
                <th className="px-5 py-3 text-right font-medium">
                  Commentaires
                </th>
                <th className="px-5 py-3 font-medium">Premier contact</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="border-b border-[#E5E9E4] last:border-0"
                >
                  <td className="px-5 py-4 font-medium text-[#252B27]">
                    {customer.name ?? "Client sans nom"}
                  </td>
                  <td className="px-5 py-4 text-[#7B857D]">
                    {customer.fbUserId}
                  </td>
                  <td className="px-5 py-4 text-right text-[#252B27]">
                    {customer._count.orders}
                  </td>
                  <td className="px-5 py-4 text-right text-[#252B27]">
                    {customer._count.comments}
                  </td>
                  <td className="px-5 py-4 text-[#7B857D]">
                    {formatDate(customer.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}