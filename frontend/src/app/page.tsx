
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
  stock: number;
  createdAt: string;
}

interface ProductsResponse {
  success: boolean;
  count: number;
  products: Product[];
}
interface Order {
  id: string;
  status: "PENDING" | "CONFIRMED" | "PAID" | "CANCELLED";
  quantity: number;
  customerFbId: string;
  customerName: string | null;
  createdAt: string;
  product: {
    code: string;
    name: string;
    price: number;
  };
}

interface OrdersResponse {
  success: boolean;
  count: number;
  orders: Order[];
}

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function Icon({
  name,
}: {
  name: "grid" | "video" | "orders" | "products" | "users" | "settings" | "search" | "refresh" | "box" | "menu";
}) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    video: <><rect x="3" y="5" width="13" height="14" rx="2" /><path d="m16 10 5-3v10l-5-3" /></>,
    orders: <><path d="M4 4h16v17H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
    products: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 8 9 5 9-5M3 8v9l9 5 9-5V8M12 13v9" /></>,
    users: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v1" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.7Z" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 9a7 7 0 0 1 12-2L20 12M4 12l2.5 5a7 7 0 0 0 12-2" /></>,
    box: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="M3 8v9l9 5 9-5V8" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px] shrink-0"
    >
      {paths[name]}
    </svg>
  );
}

const navigation = [
  {
    label: "Vue d'ensemble",
    icon: "grid",
    href: "#overview",
    active: true,
  },
  {
    label: "Sessions Live",
    icon: "video",
    href: "#coming-soon",
    active: false,
  },
  {
    label: "Commandes",
    icon: "orders",
    href: "#coming-soon",
    active: false,
  },
  {
    label: "Produits",
    icon: "products",
    href: "#products",
    active: false,
  },
  {
    label: "Clients",
    icon: "users",
    href: "#coming-soon",
    active: false,
  },
] as const;

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
const [updatingProduct, setUpdatingProduct] = useState(false);
const [editError, setEditError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
const [loadingOrders, setLoadingOrders] = useState(true);
const [ordersError, setOrdersError] = useState("");

const [editData, setEditData] = useState({
  code: "",
  name: "",
  price: "",
  stock: "",
});
const [formData, setFormData] = useState({
  code: "",
  name: "",
  price: "",
  stock: "0",
});

const fetchOrders = useCallback(async () => {
  await newFunction();

  async function newFunction() {
    try {
      setLoadingOrders(true);
      setOrdersError("");

      const response = await fetch(`${API_URL}/orders`);
      const data: OrdersResponse = await response.json();

      if (!response.ok || !data.success || !Array.isArray(data.orders)) {
        throw new Error("Impossible de récupérer les commandes.");
      }

      setOrders(data.orders);
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : "Une erreur est survenue lors du chargement des commandes."
      );
    } finally {
      setLoadingOrders(false);
    }
  }
}, []); 
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const data: ProductsResponse = await response.json();

      if (!data.success || !Array.isArray(data.products)) {
        throw new Error("Réponse invalide du serveur.");
      }

      setProducts(data.products);
    } catch (err) {
      console.error("Erreur de chargement des produits :", err);
      setError(
        "Impossible de charger les produits. Vérifie que le serveur backend fonctionne."
      );
    } finally {
      setLoading(false);
    }
  }, []);
  const handleUpdateProduct = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!editingProduct) return;

    setUpdatingProduct(true);
    setEditError("");

    try {
      const response = await fetch(
        `${API_URL}/products/${editingProduct.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code: editData.code.trim().toUpperCase(),
            name: editData.name.trim(),
            price: Number(editData.price),
            stock: Number(editData.stock),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Impossible de modifier le produit.");
      }

      setEditingProduct(null);
      await fetchProducts();
    } catch (err) {
      setEditError(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue."
      );
    } finally {
      setUpdatingProduct(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmingDelete) return;

    setDeletingProduct(true);
    setDeleteError("");

    try {
      const response = await fetch(
        `${API_URL}/products/${confirmingDelete.id}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Impossible de supprimer ce produit."
        );
      }

      setConfirmingDelete(null);
      await fetchProducts();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Une erreur est survenue."
      );
    } finally {
      setDeletingProduct(false);
    }
  };

  const handleCreateProduct = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  setSavingProduct(true);
  setFormError("");

  try {
    const response = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        price: Number(formData.price),
        stock: Number(formData.stock),
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Impossible de créer le produit."
      );
    }

    setFormData({
      code: "",
      name: "",
      price: "",
      stock: "0",
    });

    setShowProductForm(false);

    await fetchProducts();
  } catch (err) {
    setFormError(
      err instanceof Error
        ? err.message
        : "Une erreur est survenue."
    );
  } finally {
    setSavingProduct(false);
  }
};

  useEffect(() => {
  let cancelled = false;

  const loadInitialProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`);

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }

      const data: ProductsResponse = await response.json();

      if (!data.success || !Array.isArray(data.products)) {
        throw new Error("Réponse invalide du serveur.");
      }

      if (!cancelled) {
        setProducts(data.products);
      }
    } catch (err) {
      if (!cancelled) {
        console.error("Erreur de chargement des produits :", err);

        setError(
          "Impossible de charger les produits. Vérifie que le serveur backend fonctionne."
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  };

  void loadInitialProducts();

  return () => {
    cancelled = true;
  };
}, []);
  

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return products;

    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        product.code.toLowerCase().includes(term)
    );
  }, [products, search]);

  const totalStock = products.reduce(
    (total, product) => total + product.stock,
    0
  );

  const totalValue = products.reduce(
    (total, product) => total + product.price * product.stock,
    0
  );

  const lowStockCount = products.filter(
    (product) => product.stock > 0 && product.stock <= 5
  ).length;

  const outOfStockCount = products.filter(
    (product) => product.stock === 0
  ).length;

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("fr-FR").format(value);

  return (
    <div className="min-h-screen bg-[#F5F6F4] text-[#252B27]">
      <div className="flex min-h-screen">
        {/* Navigation latérale */}
       <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[250px] shrink-0 flex-col overflow-y-auto bg-[#202923] px-4 py-6 text-white lg:flex">
               <div className="mb-10 px-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#DCE9DF] text-sm font-bold text-[#244B35]">
                TL
              </div>
              <div>
                <p className="text-[17px] font-semibold tracking-tight">
                  Tiako Live
                </p>
                <p className="text-[11px] text-[#AAB6AD]">
                  Social Commerce
                </p>
              </div>
            </div>
          </div>

          <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#849188]">
            Espace de travail
          </p>

          <nav className="space-y-1">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] transition ${
                  item.active
                    ? "bg-[#34483B] font-medium text-white"
                    : "text-[#C0C9C2] hover:bg-[#2B382F] hover:text-white"
                }`}
              >
                <Icon name={item.icon} />
                {item.label}
                {item.href === "#coming-soon" && (
                  <span className="ml-auto text-[9px] text-[#91A096]">
                    Bientôt
                  </span>
                )}
              </a>
            ))}
          </nav>

          <div className="mt-auto border-t border-[#39443D] pt-5">
            <a
              href="#coming-soon"
              className="flex items-center gap-3 rounded-lg px-3 py-3 text-[13px] text-[#C0C9C2] transition hover:bg-[#2B382F]"
            >
              <Icon name="settings" />
              Paramètres
            </a>
            <div className="mt-5 flex items-center gap-3 rounded-lg bg-[#2A352D] p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#DCE9DF] text-xs font-semibold text-[#244B35]">
                TL
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">Espace vendeur</p>
                <p className="text-[10px] text-[#AAB6AD]">
                  Environnement de test
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Contenu */}
        <main className="ml-0 min-w-0 flex-1 lg:ml-[250px]">
          <header className="flex h-[72px] items-center justify-between border-b border-[#E7EAE6] bg-white px-5 md:px-9">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F0F3EF] text-[#405C49] lg:hidden">
                <Icon name="menu" />
              </div>
              <div>
                <p className="text-[11px] text-[#858E87]">
                  Tiako Live / Gestion
                </p>
                <h1 className="text-[15px] font-semibold tracking-tight">
                  Vue d&apos;ensemble
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-[#858E87] sm:inline">
                Tableau de bord
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E9E5] bg-[#F5F7F4] text-xs font-semibold text-[#405C49]">
                TL
              </div>
            </div>
          </header>

          <div className="mx-auto w-full max-w-[1440px] p-4 sm:p-5 lg:p-8 xl:p-9">
            {/* En-tête de page */}
            <section className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs font-medium text-[#758078]">
                  ESPACE VENDEUR
                </p>
                <h2 className="text-[25px] font-semibold tracking-[-0.04em] text-[#252B27]">
                  Vue d&apos;ensemble
                </h2>
                <p className="mt-1 text-[13px] text-[#7B857D]">
                  Suivez vos produits et votre niveau de stock.
                </p>
              </div>

              <button
                onClick={fetchProducts}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#DDE3DD] bg-white px-4 text-xs font-semibold text-[#39483D] shadow-sm transition hover:bg-[#F7F9F6] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="refresh" />
                {loading ? "Actualisation..." : "Actualiser"}
              </button>
            </section>

            {/* Indicateurs */}
            <section
              id="overview"
              className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            >
              <article className="rounded-xl border border-[#E5E9E4] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#758078]">
                    Produits enregistrés
                  </p>
                  <span className="rounded-md bg-[#F0F3EF] p-2 text-[#49644F]">
                    <Icon name="products" />
                  </span>
                </div>
                <p className="mt-4 text-[27px] font-semibold tracking-tight">
                  {formatNumber(products.length)}
                </p>
                <p className="mt-1 text-[11px] text-[#8A938C]">
                  Dans votre catalogue
                </p>
              </article>

              <article className="rounded-xl border border-[#E5E9E4] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#758078]">
                    Stock disponible
                  </p>
                  <span className="rounded-md bg-[#F0F3EF] p-2 text-[#49644F]">
                    <Icon name="box" />
                  </span>
                </div>
                <p className="mt-4 text-[27px] font-semibold tracking-tight">
                  {formatNumber(totalStock)}
                </p>
                <p className="mt-1 text-[11px] text-[#8A938C]">
                  Unités en stock
                </p>
              </article>

              <article className="rounded-xl border border-[#E5E9E4] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#758078]">
                    Valeur du stock
                  </p>
                  <span className="rounded-md bg-[#F0F3EF] p-2 text-[#49644F]">
                    <span className="text-sm font-semibold">Ar</span>
                  </span>
                </div>
                <p className="mt-4 text-[27px] font-semibold tracking-tight">
                  {formatNumber(totalValue)}
                </p>
                <p className="mt-1 text-[11px] text-[#8A938C]">
                  Prix unitaire × quantité
                </p>
              </article>

              <article className="rounded-xl border border-[#E5E9E4] bg-white p-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-[#758078]">
                    Alertes de stock
                  </p>
                  <span className="rounded-md bg-[#F8F2E8] p-2 text-[#A77A35]">
                    <span className="text-sm font-semibold">!</span>
                  </span>
                </div>
                <p className="mt-4 text-[27px] font-semibold tracking-tight">
                  {lowStockCount + outOfStockCount}
                </p>
                <p className="mt-1 text-[11px] text-[#8A938C]">
                  Stock faible ou épuisé
                </p>
              </article>
            </section>

            {/* Alertes réelles */}
            {!loading && (lowStockCount > 0 || outOfStockCount > 0) && (
              <div className="mb-6 rounded-lg border border-[#E9DFC9] bg-[#FBF8F1] px-4 py-3 text-xs text-[#806638]">
                <strong>Attention :</strong>{" "}
                {outOfStockCount > 0 &&
                  `${outOfStockCount} produit(s) en rupture de stock. `}
                {lowStockCount > 0 &&
                  `${lowStockCount} produit(s) avec un stock faible.`}
              </div>
            )}

            {/* Catalogue */}
            <section
              id="products"
              className="overflow-hidden rounded-xl border border-[#E5E9E4] bg-white"
            >
             <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECEFEC] px-5 py-5 md:px-6">
  <div>
    <h3 className="text-[14px] font-semibold">
      Catalogue produits
    </h3>
    <p className="mt-1 text-[11px] text-[#879088]">
      Consultez les références et les quantités disponibles.
    </p>
  </div>

  <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
    <div className="relative min-w-0 flex-1 sm:w-[260px] sm:flex-none">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#929B94]">
        <Icon name="search" />
      </span>

      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Rechercher un produit..."
        className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-[#FAFBFA] pl-10 pr-3 text-xs outline-none transition placeholder:text-[#A1A9A2] focus:border-[#829A87] focus:bg-white"
      />
    </div>

    <button
      type="button"
      onClick={() => {
        setFormError("");
        setShowProductForm(true);
      }}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[#405C49] px-4 text-xs font-semibold text-white transition hover:bg-[#344B3B]"
    >
      <span className="text-base">+</span>
      Nouveau produit
    </button>
  </div>
</div>
{showProductForm && (
  <div className="border-b border-[#ECEFEC] bg-[#FAFBF9] p-5 md:p-6">
    <div className="mb-5 flex items-center justify-between">
      <div>
        <h4 className="text-sm font-semibold text-[#303832]">
          Ajouter un produit
        </h4>
        <p className="mt-1 text-[11px] text-[#879088]">
          Renseigne les informations du nouveau produit.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowProductForm(false);
          setFormError("");
        }}
        className="text-xs font-medium text-[#758078] hover:text-[#303832]"
      >
        Fermer
      </button>
    </div>

    <form
      onSubmit={handleCreateProduct}
      className="grid gap-4 sm:grid-cols-2"
    >
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#59645C]">
          Code produit
        </label>
        <input
          required
          value={formData.code}
          onChange={(event) =>
            setFormData({ ...formData, code: event.target.value })
          }
          placeholder="Ex : A3"
          className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#59645C]">
          Nom du produit
        </label>
        <input
          required
          value={formData.name}
          onChange={(event) =>
            setFormData({ ...formData, name: event.target.value })
          }
          placeholder="Ex : Robe longue"
          className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#59645C]">
          Prix unitaire
        </label>
        <input
          required
          type="number"
          min="1"
          step="1"
          value={formData.price}
          onChange={(event) =>
            setFormData({ ...formData, price: event.target.value })
          }
          placeholder="Ex : 25000"
          className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-[#59645C]">
          Quantité en stock
        </label>
        <input
          required
          type="number"
          min="0"
          step="1"
          value={formData.stock}
          onChange={(event) =>
            setFormData({ ...formData, stock: event.target.value })
          }
          className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
        />
      </div>

      {formError && (
        <div className="rounded-lg border border-[#E8CACA] bg-[#FBF3F3] p-3 text-xs text-[#A34444] sm:col-span-2">
          {formError}
        </div>
      )}

      <div className="flex justify-end gap-3 sm:col-span-2">
        <button
          type="button"
          onClick={() => setShowProductForm(false)}
          className="h-10 rounded-lg border border-[#DDE3DD] bg-white px-4 text-xs font-semibold text-[#59645C] hover:bg-[#F5F7F4]"
        >
          Annuler
        </button>

        <button
          type="submit"
          disabled={savingProduct}
          className="h-10 rounded-lg bg-[#405C49] px-5 text-xs font-semibold text-white transition hover:bg-[#344B3B] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {savingProduct ? "Enregistrement..." : "Enregistrer le produit"}
        </button>
      </div>
    </form>
  </div>
)}
              {error && (
                <div className="m-5 rounded-lg border border-[#E8CACA] bg-[#FBF3F3] p-4 text-xs text-[#A34444]">
                  <p>{error}</p>
                  <button
                    onClick={fetchProducts}
                    className="mt-2 font-semibold underline"
                  >
                    Réessayer
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left">
                  <thead className="bg-[#F8F9F7]">
                    <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#89928B]">
                      <th className="px-6 py-3.5">Référence</th>
                      <th className="px-6 py-3.5">Produit</th>
                      <th className="px-6 py-3.5">Prix unitaire</th>
                      <th className="px-6 py-3.5">Quantité</th>
                      <th className="px-6 py-3.5">État du stock</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#EEF0ED]">
                    {loading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-xs text-[#89928B]"
                        >
                          Chargement du catalogue...
                        </td>
                      </tr>
                    ) : error ? null : filteredProducts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-12 text-center text-xs text-[#89928B]"
                        >
                          {search
                            ? "Aucun produit ne correspond à votre recherche."
                            : "Aucun produit enregistré."}
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="transition hover:bg-[#FAFBF9]"
                        >
                          <td className="px-6 py-4">
                            <span className="rounded-md bg-[#F1F4F0] px-2 py-1 text-[11px] font-semibold text-[#526A57]">
                              {product.code}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-[#303832]">
                              {product.name}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-xs text-[#59645C]">
                            {formatNumber(product.price)}
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-[#303832]">
                            {formatNumber(product.stock)}
                          </td>
                          <td className="px-6 py-4">
                            {product.stock === 0 ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#B44F4F]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#C66A6A]" />
                                Épuisé
                              </span>
                            ) : product.stock <= 5 ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#A77A35]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#C99A50]" />
                                Stock faible
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#4D805B]">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#68A477]" />
                                Disponible
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingProduct(product);
                                setEditData({
                                  code: product.code,
                                  name: product.name,
                                  price: String(product.price),
                                  stock: String(product.stock),
                                });
                                setEditError("");
                              }}
                              className="rounded-lg border border-[#E5E9E4] px-3 py-2 text-[11px] font-medium text-[#405C49] transition hover:bg-[#F5F6F4]"
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmingDelete(product);
                                setDeleteError("");
                              }}
                              className="ml-2 rounded-lg border border-[#E8D5D5] px-3 py-2 text-[11px] font-medium text-[#A34444] transition hover:bg-[#FBF3F3]"
                            >
                              Supprimer
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#ECEFEC] px-6 py-4">
                <p className="text-[11px] text-[#89928B]">
                  {loading
                    ? "Chargement..."
                    : `${filteredProducts.length} produit(s) affiché(s) sur ${products.length}`}
                </p>
                <p className="text-[10px] text-[#A0A8A1]">
                  Données synchronisées avec le serveur
                </p>
              </div>
            </section>
            <section
  id="orders"
  className="mt-8 overflow-hidden rounded-xl border border-[#E5E9E4] bg-white"
>
  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ECEFEC] px-5 py-5 md:px-6">
    <div>
      <h3 className="text-[14px] font-semibold">
        Commandes
      </h3>
      <p className="mt-1 text-[11px] text-[#879088]">
        Consultez les commandes reçues pendant vos ventes Live.
      </p>
    </div>

    <button
      type="button"
      onClick={fetchOrders}
      disabled={loadingOrders}
      className="h-10 rounded-lg border border-[#E1E6E1] bg-white px-4 text-xs font-semibold text-[#405C49] hover:bg-[#F5F7F4] disabled:opacity-50"
    >
      {loadingOrders ? "Actualisation..." : "Actualiser"}
    </button>
  </div>

  {ordersError && (
    <div className="m-5 rounded-lg border border-[#E8CACA] bg-[#FBF3F3] p-4 text-xs text-[#A34444]">
      <p>{ordersError}</p>
      <button
        type="button"
        onClick={fetchOrders}
        className="mt-2 font-semibold underline"
      >
        Réessayer
      </button>
    </div>
  )}

  <div className="overflow-x-auto">
    <table className="w-full min-w-[850px] text-left">
      <thead className="bg-[#F8F9F7]">
        <tr className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#89928B]">
          <th className="px-6 py-3.5">Client</th>
          <th className="px-6 py-3.5">Produit</th>
          <th className="px-6 py-3.5">Quantité</th>
          <th className="px-6 py-3.5">Prix unitaire</th>
          <th className="px-6 py-3.5">Total</th>
          <th className="px-6 py-3.5">Statut</th>
          <th className="px-6 py-3.5">Date</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[#EEF0ED]">
        {loadingOrders ? (
          <tr>
            <td colSpan={7} className="px-6 py-12 text-center text-xs text-[#89928B]">
              Chargement des commandes...
            </td>
          </tr>
        ) : ordersError ? null : orders.length === 0 ? (
          <tr>
            <td colSpan={7} className="px-6 py-12 text-center text-xs text-[#89928B]">
              Aucune commande enregistrée.
            </td>
          </tr>
        ) : (
          orders.map((order) => (
            <tr key={order.id} className="transition hover:bg-[#FAFBF9]">
              <td className="px-6 py-4">
                <p className="text-xs font-semibold text-[#303832]">
                  {order.customerName || "Client inconnu"}
                </p>
                <p className="mt-1 text-[10px] text-[#89928B]">
                  {order.customerFbId}
                </p>
              </td>

              <td className="px-6 py-4">
                <p className="text-xs font-semibold text-[#303832]">
                  {order.product.name}
                </p>
                <p className="mt-1 text-[10px] text-[#89928B]">
                  Réf. {order.product.code}
                </p>
              </td>

              <td className="px-6 py-4 text-xs text-[#59645C]">
                {formatNumber(order.quantity)}
              </td>

              <td className="px-6 py-4 text-xs text-[#59645C]">
                {formatNumber(order.product.price)} Ar
              </td>

              <td className="px-6 py-4 text-xs font-semibold text-[#303832]">
                {formatNumber(order.product.price * order.quantity)} Ar
              </td>

              <td className="px-6 py-4">
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    order.status === "PENDING"
                      ? "bg-[#FFF5E5] text-[#A77A35]"
                      : order.status === "CONFIRMED"
                      ? "bg-[#EAF3EC] text-[#4D805B]"
                      : order.status === "PAID"
                      ? "bg-[#E9F0FA] text-[#456C9A]"
                      : "bg-[#FBEEEE] text-[#B44F4F]"
                  }`}
                >
                  {order.status === "PENDING"
                    ? "En attente"
                    : order.status === "CONFIRMED"
                    ? "Confirmée"
                    : order.status === "PAID"
                    ? "Payée"
                    : "Annulée"}
                </span>
              </td>

              <td className="px-6 py-4 text-[11px] text-[#89928B]">
                {new Date(order.createdAt).toLocaleString("fr-FR")}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  </div>

  <div className="border-t border-[#ECEFEC] px-6 py-4">
    <p className="text-[11px] text-[#89928B]">
      {loadingOrders
        ? "Chargement..."
        : `${orders.length} commande(s) enregistrée(s)`}
    </p>
  </div>
</section>

            {editingProduct && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                role="presentation"
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="edit-product-title"
                  className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
                >
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3
                        id="edit-product-title"
                        className="text-base font-semibold text-[#303832]"
                      >
                        Modifier le produit
                      </h3>
                      <p className="mt-1 text-xs text-[#879088]">
                        Modifie les informations de {editingProduct.name}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(null);
                        setEditError("");
                      }}
                      disabled={updatingProduct}
                      aria-label="Fermer la fenêtre"
                      className="rounded-lg px-2 py-1 text-lg text-[#758078] hover:bg-[#F5F6F4] disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>

                  <form
                    onSubmit={handleUpdateProduct}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <div>
                      <label
                        htmlFor="edit-product-code"
                        className="mb-1.5 block text-xs font-medium text-[#59645C]"
                      >
                        Code produit
                      </label>
                      <input
                        id="edit-product-code"
                        required
                        value={editData.code}
                        onChange={(event) =>
                          setEditData({ ...editData, code: event.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-product-name"
                        className="mb-1.5 block text-xs font-medium text-[#59645C]"
                      >
                        Nom du produit
                      </label>
                      <input
                        id="edit-product-name"
                        required
                        value={editData.name}
                        onChange={(event) =>
                          setEditData({ ...editData, name: event.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-product-price"
                        className="mb-1.5 block text-xs font-medium text-[#59645C]"
                      >
                        Prix unitaire
                      </label>
                      <input
                        id="edit-product-price"
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={editData.price}
                        onChange={(event) =>
                          setEditData({ ...editData, price: event.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="edit-product-stock"
                        className="mb-1.5 block text-xs font-medium text-[#59645C]"
                      >
                        Quantité en stock
                      </label>
                      <input
                        id="edit-product-stock"
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={editData.stock}
                        onChange={(event) =>
                          setEditData({ ...editData, stock: event.target.value })
                        }
                        className="h-10 w-full rounded-lg border border-[#E1E6E1] bg-white px-3 text-xs outline-none focus:border-[#829A87]"
                      />
                    </div>

                    {editError && (
                      <div className="rounded-lg border border-[#E8CACA] bg-[#FBF3F3] p-3 text-xs text-[#A34444] sm:col-span-2">
                        {editError}
                      </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2 sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(null);
                          setEditError("");
                        }}
                        disabled={updatingProduct}
                        className="h-10 rounded-lg border border-[#DDE3DD] bg-white px-4 text-xs font-semibold text-[#59645C] hover:bg-[#F5F7F4] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        type="submit"
                        disabled={updatingProduct}
                        className="h-10 rounded-lg bg-[#405C49] px-5 text-xs font-semibold text-white transition hover:bg-[#344B3B] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updatingProduct ? "Modification..." : "Enregistrer"}
                      </button>
                    </div>
                  </form>
                </section>
              </div>
            )}

            {confirmingDelete && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                role="presentation"
              >
                <section
                  role="alertdialog"
                  aria-modal="true"
                  aria-labelledby="delete-product-title"
                  aria-describedby="delete-product-description"
                  className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FBF3F3] text-lg font-semibold text-[#A34444]">
                      !
                    </div>
                    <div>
                      <h3
                        id="delete-product-title"
                        className="text-base font-semibold text-[#303832]"
                      >
                        Supprimer ce produit ?
                      </h3>
                      <p
                        id="delete-product-description"
                        className="mt-1 text-xs leading-5 text-[#758078]"
                      >
                        Tu es sur le point de supprimer <strong>{confirmingDelete.name}</strong> (référence {confirmingDelete.code}). Cette action est définitive.
                      </p>
                    </div>
                  </div>

                  <p className="mb-4 rounded-lg border border-[#E9DFC9] bg-[#FBF8F1] p-3 text-xs leading-5 text-[#806638]">
                    Si ce produit est déjà associé à une commande, le serveur refusera sa suppression pour préserver l’historique.
                  </p>

                  {deleteError && (
  <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#E8CACA] bg-[#FBF3F3] p-3 text-xs text-[#A34444]">
    <span className="mt-0.5 shrink-0">⚠️</span>
    <div>
      <p className="font-semibold">Suppression impossible</p>
      <p className="mt-1">
        {deleteError.includes("associé à une ou plusieurs commandes")
          ? "Ce produit est déjà associé à une ou plusieurs commandes. Pour conserver l'historique des ventes, il ne peut pas être supprimé."
          : deleteError}
      </p>
    </div>
  </div>
)}

                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingDelete(null);
                        setDeleteError("");
                      }}
                      disabled={deletingProduct}
                      className="h-10 rounded-lg border border-[#DDE3DD] bg-white px-4 text-xs font-semibold text-[#59645C] hover:bg-[#F5F7F4] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteProduct}
                      disabled={deletingProduct}
                      className="h-10 rounded-lg bg-[#A34444] px-5 text-xs font-semibold text-white transition hover:bg-[#873838] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingProduct ? "Suppression..." : "Confirmer la suppression"}
                    </button>
                  </div>
                </section>
              </div>
            )}

            <footer className="mt-7 flex flex-wrap items-center justify-between gap-2 text-[10px] text-[#9AA29B]">
              <span>Tiako Live · Gestion commerciale</span>
              <span>Environnement de développement</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}