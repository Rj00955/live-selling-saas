
"use client";
import { apiFetch } from "../../lib/api";
import { useCallback, useEffect, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ProductVariant {
  id?: string;
  stock: number;
  size?: string;
  color?: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  hasVariants?: boolean;
  variants?: ProductVariant[];
}

interface ProductsResponse {
  success?: boolean;
  count?: number;
  products?: Product[];
}

export default function DashboardOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

 const loadProducts = useCallback(async () => {
  try {
    const response = await apiFetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Impossible de charger les produits.");
    }

    const data: Product[] | ProductsResponse =
      await response.json();

    const receivedProducts = Array.isArray(data)
      ? data
      : data.products ?? [];

    return receivedProducts;
  } catch (err) {
    throw err instanceof Error
      ? err
      : new Error("Une erreur est survenue.");
  }
}, []);

const refreshProducts = useCallback(async () => {
  setLoading(true);

  try {
    const receivedProducts = await loadProducts();
    setProducts(receivedProducts);
    setError("");
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Une erreur est survenue."
    );
  } finally {
    setLoading(false);
  }
}, [loadProducts]);

useEffect(() => {
  let active = true;

  loadProducts()
    .then((receivedProducts) => {
      if (active) {
        setProducts(receivedProducts);
        setError("");
      }
    })
    .catch((err: unknown) => {
      if (active) {
        setError(
          err instanceof Error
            ? err.message
            : "Une erreur est survenue."
        );
      }
    })
    .finally(() => {
      if (active) {
        setLoading(false);
      }
    });

  return () => {
    active = false;
  };
}, [loadProducts]);

  // Calcule le stock réel : stock des variantes ou stock simple.
  const getProductStock = (product: Product): number => {
    if (product.hasVariants) {
      return (product.variants ?? []).reduce(
        (total, variant) =>
          total + Number(variant.stock || 0),
        0
      );
    }

    return Number(product.stock || 0);
  };

  const totalProducts = products.length;

  const totalStock = products.reduce(
    (total, product) =>
      total + getProductStock(product),
    0
  );

  const stockValue = products.reduce(
    (total, product) =>
      total +
      Number(product.price || 0) *
        getProductStock(product),
    0
  );

  const lowStock = products.filter((product) => {
    const stock = getProductStock(product);
    return stock > 0 && stock <= 5;
  });

  const outOfStock = products.filter(
    (product) => getProductStock(product) <= 0
  );

  const availableProducts = products.filter(
    (product) => getProductStock(product) > 0
  );

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("fr-FR").format(price) + " Ar";

  const stats = [
    {
      label: "Total produits",
      value: totalProducts,
      detail: "Produits enregistrés",
      icon: "▦",
    },
    {
      label: "Stock disponible",
      value: totalStock,
      detail: "Unités en stock",
      icon: "□",
    },
    {
      label: "Valeur du stock",
      value: formatPrice(stockValue),
      detail: "Valeur totale estimée",
      icon: "₳",
    },
    {
      label: "Stock faible",
      value: lowStock.length,
      detail: "Produits à réapprovisionner",
      icon: "!",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[#7B857D]">
            Vue générale
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[#252B27]">
            Tableau de bord
          </h2>
          <p className="mt-2 text-sm text-[#7B857D]">
            Suivez l&apos;activité de votre boutique en un coup d&apos;œil.
          </p>
        </div>

        <button
          onClick={() => void refreshProducts()}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E9E4] bg-white px-4 py-2.5 text-sm font-medium text-[#405C49] transition hover:bg-[#F5F6F4] disabled:opacity-50"
        >
          <span>↻</span>
          Actualiser
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-[#E5E9E4] bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-[#7B857D]">
                {stat.label}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DCE9DF] text-lg font-semibold text-[#405C49]">
                {stat.icon}
              </span>
            </div>

            <p className="mt-5 text-2xl font-semibold text-[#252B27]">
              {loading ? "—" : stat.value}
            </p>

            <p className="mt-1 text-xs text-[#7B857D]">
              {stat.detail}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-[#252B27]">
                Alertes de stock
              </h3>
              <p className="mt-1 text-sm text-[#7B857D]">
                Produits nécessitant votre attention
              </p>
            </div>

            <span className="rounded-full bg-[#F5F6F4] px-3 py-1 text-xs font-medium text-[#405C49]">
              {loading
                ? "—"
                : lowStock.length + outOfStock.length}{" "}
              alertes
            </span>
          </div>

          {loading ? (
            <p className="mt-6 text-sm text-[#7B857D]">
              Chargement des alertes...
            </p>
          ) : lowStock.length === 0 &&
            outOfStock.length === 0 ? (
            <div className="mt-6 rounded-xl bg-[#F5F6F4] p-5 text-center">
              <p className="text-sm font-medium text-[#405C49]">
                Tout est en ordre !
              </p>
              <p className="mt-1 text-xs text-[#7B857D]">
                Aucun produit avec un stock faible ou épuisé.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {outOfStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#252B27]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-[#7B857D]">
                      Code : {product.code}
                    </p>
                  </div>

                  <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-700">
                    Rupture
                  </span>
                </div>
              ))}

              {lowStock.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/60 p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-[#252B27]">
                      {product.name}
                    </p>
                    <p className="mt-1 text-xs text-[#7B857D]">
                      Code : {product.code}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    {getProductStock(product)} restant(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-[#252B27]">
            Aperçu de la boutique
          </h3>
          <p className="mt-1 text-sm text-[#7B857D]">
            État actuel du catalogue
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#7B857D]">
                  Produits disponibles
                </span>
                <span className="font-semibold text-[#252B27]">
                  {loading ? "—" : availableProducts.length}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0F2EF]">
                <div
                  className="h-full rounded-full bg-[#405C49] transition-all"
                  style={{
                    width: `${
                      totalProducts
                        ? (availableProducts.length /
                            totalProducts) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#7B857D]">
                  Produits en rupture
                </span>
                <span className="font-semibold text-[#252B27]">
                  {loading ? "—" : outOfStock.length}
                </span>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#F0F2EF]">
                <div
                  className="h-full rounded-full bg-red-400 transition-all"
                  style={{
                    width: `${
                      totalProducts
                        ? (outOfStock.length /
                            totalProducts) *
                          100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="rounded-xl bg-[#F5F6F4] p-4">
              <p className="text-sm font-medium text-[#405C49]">
                Conseil
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#7B857D]">
                Surveille régulièrement les produits en stock faible
                afin d&apos;éviter les ruptures pendant tes sessions de vente
                en direct.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
