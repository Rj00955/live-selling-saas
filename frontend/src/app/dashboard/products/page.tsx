
"use client";
import { apiFetch } from "../../../lib/api";
import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ProductVariant {
  id?: string;
  size?: string | null;
  color?: string | null;
  stock: number;
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

type StockFilter = "all" | "available" | "low" | "out";

interface VariantDraft {
  id?: string;
  size: string;
  color: string;
  stock: string;
}

interface ProductDraft {
  code: string;
  name: string;
  price: string;
  stock: string;
  hasVariants: boolean;
  variants: VariantDraft[];
}

function getProductStock(product: Product): number {
  if (product.hasVariants && product.variants) {
    return product.variants.reduce(
      (total, variant) => total + (Number(variant.stock) || 0),
      0
    );
  }

  return Number(product.stock) || 0;
}

function formatPrice(price: number): string {
  return `${Number(price || 0).toLocaleString("fr-FR")} Ar`;
}

function emptyDraft(): ProductDraft {
  return {
    code: "",
    name: "",
    price: "",
    stock: "0",
    hasVariants: false,
    variants: [{ size: "", color: "", stock: "0" }],
  };
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.message ?? "Une erreur est survenue.";
  } catch {
    return "Une erreur est survenue.";
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [draft, setDraft] = useState<ProductDraft>(emptyDraft());
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
const [deleting, setDeleting] = useState(false);

  const loadProducts = useCallback(async () => {
    const response = await apiFetch(`${API_URL}/products`);

    if (!response.ok) {
      throw new Error("Impossible de charger les produits.");
    }

    const data: Product[] | ProductsResponse = await response.json();

    return Array.isArray(data) ? data : data.products ?? [];
  }, []);

  const refreshProducts = useCallback(async () => {
    setLoading(true);

    try {
      const receivedProducts = await loadProducts();
      setProducts(receivedProducts);
      setError("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Une erreur est survenue."
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
            err instanceof Error ? err.message : "Une erreur est survenue."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const stock = getProductStock(product);

      const matchesSearch = [
        product.name,
        product.code,
        ...(product.variants ?? []).flatMap((variant) => [
          variant.size ?? "",
          variant.color ?? "",
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesFilter =
        filter === "all" ||
        (filter === "available" && stock > 5) ||
        (filter === "low" && stock > 0 && stock <= 5) ||
        (filter === "out" && stock <= 0);

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const totalStock = products.reduce(
    (total, product) => total + getProductStock(product),
    0
  );

  const totalValue = products.reduce(
    (total, product) =>
      total + Number(product.price || 0) * getProductStock(product),
    0
  );

  const lowStockCount = products.filter((product) => {
    const stock = getProductStock(product);
    return stock > 0 && stock <= 5;
  }).length;

  const outOfStockCount = products.filter(
    (product) => getProductStock(product) <= 0
  ).length;

  function getStockLabel(stock: number) {
    if (stock <= 0) {
      return {
        label: "Rupture",
        className: "bg-red-50 text-red-700",
      };
    }

    if (stock <= 5) {
      return {
        label: "Stock faible",
        className: "bg-amber-50 text-amber-700",
      };
    }

    return {
      label: "Disponible",
      className: "bg-green-50 text-green-700",
    };
  }

  function openCreateForm() {
    setEditingProduct(null);
    setDraft(emptyDraft());
    setFormError("");
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);

    setDraft({
      code: product.code,
      name: product.name,
      price: String(product.price),
      stock: String(product.stock),
      hasVariants: Boolean(product.hasVariants),
      variants:
        product.variants && product.variants.length > 0
          ? product.variants.map((variant) => ({
              id: variant.id,
              size: variant.size ?? "",
              color: variant.color ?? "",
              stock: String(variant.stock),
            }))
          : [{ size: "", color: "", stock: "0" }],
    });

    setFormError("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;

    setFormOpen(false);
    setEditingProduct(null);
    setFormError("");
  }

  function updateDraft<K extends keyof ProductDraft>(
    key: K,
    value: ProductDraft[K]
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateVariant(
    index: number,
    key: keyof VariantDraft,
    value: string
  ) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant
      ),
    }));
  }

  function addVariant() {
    setDraft((current) => ({
      ...current,
      variants: [
        ...current.variants,
        { size: "", color: "", stock: "0" },
      ],
    }));
  }

  function removeVariant(index: number) {
    setDraft((current) => ({
      ...current,
      variants: current.variants.filter((variant, variantIndex) => {
        if (variantIndex !== index) return true;

        // En modification, les variantes existantes ne peuvent pas
        // être supprimées par l'API.
        if (editingProduct && variant.id) return true;

        return false;
      }),
    }));
  }

  function validateDraft(): string {
    if (!draft.code.trim()) return "Le code produit est obligatoire.";
    if (!draft.name.trim()) return "Le nom du produit est obligatoire.";

    const price = Number(draft.price);

    if (!Number.isSafeInteger(price) || price <= 0) {
      return "Le prix doit être un entier positif.";
    }

    if (!draft.hasVariants) {
      const stock = Number(draft.stock);

      if (!Number.isSafeInteger(stock) || stock < 0) {
        return "Le stock doit être un entier positif ou nul.";
      }

      return "";
    }

    if (draft.variants.length === 0) {
      return "Ajoute au moins une variante.";
    }

    const firstHasSize = Boolean(draft.variants[0].size.trim());
    const firstHasColor = Boolean(draft.variants[0].color.trim());

    if (!firstHasSize && !firstHasColor) {
      return "Chaque variante doit avoir une taille ou une couleur.";
    }

    const combinations = new Set<string>();

    for (const variant of draft.variants) {
      const size = variant.size.trim().toUpperCase();
      const color = variant.color.trim().toUpperCase();
      const stock = Number(variant.stock);

      if (!size && !color) {
        return "Chaque variante doit avoir une taille ou une couleur.";
      }

      if (Boolean(size) !== firstHasSize || Boolean(color) !== firstHasColor) {
        return "Toutes les variantes doivent utiliser les mêmes dimensions.";
      }

      if (!Number.isSafeInteger(stock) || stock < 0) {
        return "Le stock de chaque variante doit être un entier positif ou nul.";
      }

      const key = `${size}|${color}`;

      if (combinations.has(key)) {
        return "Deux variantes ne peuvent pas avoir la même combinaison.";
      }

      combinations.add(key);
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const validationError = validateDraft();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    const variants = draft.variants.map((variant) => ({
      ...(variant.size.trim()
        ? { size: variant.size.trim() }
        : { size: null }),
      ...(variant.color.trim()
        ? { color: variant.color.trim() }
        : { color: null }),
      stock: Number(variant.stock),
    }));

    const commonData = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      price: Number(draft.price),
    };

    let url = `${API_URL}/products`;
    let method = "POST";
    let body: Record<string, unknown>;

    if (editingProduct) {
      url = `${API_URL}/products/${editingProduct.id}`;
      method = "PATCH";

      body = {
        ...commonData,
        ...(draft.hasVariants
          ? { variants }
          : { stock: Number(draft.stock) }),
      };
    } else {
      body = {
        ...commonData,
        stock: draft.hasVariants ? 0 : Number(draft.stock),
        hasVariants: draft.hasVariants,
        ...(draft.hasVariants ? { variants } : {}),
      };
    }

    setSaving(true);

    try {
      const response = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(await getErrorMessage(response));
      }

      setFormOpen(false);
      setEditingProduct(null);
      await refreshProducts();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le produit."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
  if (!productToDelete) return;

  setDeleting(true);
  setError("");

  try {
    const response = await apiFetch(
      `${API_URL}/products/${productToDelete.id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error(await getErrorMessage(response));
    }

    setProductToDelete(null);
    await refreshProducts();
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Impossible de supprimer le produit."
    );
  } finally {
    setDeleting(false);
  }
}

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-[#7B857D]">Gestion de la boutique</p>
          <h1 className="mt-1 text-2xl font-bold text-[#252B27]">
            Produits
          </h1>
          <p className="mt-1 text-sm text-[#7B857D]">
            Consulte et suis les produits et leurs stocks.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refreshProducts()}
            disabled={loading}
            className="rounded-xl border border-[#E5E9E4] bg-white px-4 py-2.5 text-sm font-medium text-[#405C49] transition hover:bg-[#F5F6F4] disabled:opacity-50"
          >
            {loading ? "Chargement..." : "Actualiser"}
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="rounded-xl bg-[#405C49] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#314936]"
          >
            + Ajouter un produit
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Total produits</p>
          <p className="mt-2 text-2xl font-bold text-[#252B27]">
            {products.length}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Stock disponible</p>
          <p className="mt-2 text-2xl font-bold text-[#405C49]">
            {totalStock}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Valeur du stock</p>
          <p className="mt-2 text-xl font-bold text-[#252B27]">
            {formatPrice(totalValue)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#E5E9E4] bg-white p-5">
          <p className="text-sm text-[#7B857D]">Alertes de stock</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">
            {lowStockCount + outOfStockCount}
          </p>
          <p className="mt-1 text-xs text-[#7B857D]">
            {lowStockCount} faible(s) · {outOfStockCount} en rupture
          </p>
        </div>
      </div>

      {/* Formulaire d'ajout / modification */}
      {formOpen && (
        <section className="rounded-2xl border border-[#DCE9DF] bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#252B27]">
                {editingProduct ? "Modifier le produit" : "Ajouter un produit"}
              </h2>
              <p className="mt-1 text-sm text-[#7B857D]">
                Renseigne les informations du produit.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="rounded-lg px-3 py-1.5 text-sm text-[#7B857D] hover:bg-[#F5F6F4]"
            >
              Fermer
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#405C49]">
                  Code produit
                </span>
                <input
                  required
                  value={draft.code}
                  onChange={(event) => updateDraft("code", event.target.value)}
                  placeholder="Ex. RB45"
                  className="w-full rounded-xl border border-[#E5E9E4] bg-[#F5F6F4] px-4 py-3 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#405C49]">
                  Nom du produit
                </span>
                <input
                  required
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="Ex. Robe courte"
                  className="w-full rounded-xl border border-[#E5E9E4] bg-[#F5F6F4] px-4 py-3 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-[#405C49]">
                  Prix (Ar)
                </span>
                <input
                  required
                  type="number"
                  min="1"
                  step="1"
                  value={draft.price}
                  onChange={(event) => updateDraft("price", event.target.value)}
                  placeholder="Ex. 17000"
                  className="w-full rounded-xl border border-[#E5E9E4] bg-[#F5F6F4] px-4 py-3 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                />
              </label>

              {!draft.hasVariants && (
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#405C49]">
                    Stock
                  </span>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={draft.stock}
                    onChange={(event) => updateDraft("stock", event.target.value)}
                    className="w-full rounded-xl border border-[#E5E9E4] bg-[#F5F6F4] px-4 py-3 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                  />
                </label>
              )}
            </div>

            {!editingProduct && (
              <label className="flex items-center gap-3 rounded-xl bg-[#F5F6F4] p-4">
                <input
                  type="checkbox"
                  checked={draft.hasVariants}
                  onChange={(event) => {
                    const checked = event.target.checked;
                    updateDraft("hasVariants", checked);
                    if (checked) updateDraft("stock", "0");
                  }}
                  className="h-4 w-4 accent-[#405C49]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#252B27]">
                    Ce produit possède des variantes
                  </span>
                  <span className="mt-0.5 block text-xs text-[#7B857D]">
                    Par exemple : tailles, couleurs ou tailles et couleurs.
                  </span>
                </span>
              </label>
            )}

            {editingProduct?.hasVariants && (
              <div className="rounded-xl bg-[#F5F6F4] p-4 text-sm text-[#68736A]">
                Ce produit possède des variantes. Son type et les dimensions
                de ses variantes ne peuvent pas être changés ici.
              </div>
            )}

            {draft.hasVariants && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-[#252B27]">
                      Variantes du produit
                    </h3>
                    <p className="mt-1 text-xs text-[#7B857D]">
                      Utilise les mêmes dimensions pour toutes les variantes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="rounded-lg border border-[#DCE9DF] bg-[#F5F6F4] px-3 py-2 text-sm font-medium text-[#405C49] hover:bg-[#DCE9DF]"
                  >
                    + Ajouter une variante
                  </button>
                </div>

                {draft.variants.map((variant, index) => (
                  <div
                    key={variant.id ?? `new-${index}`}
                    className="grid grid-cols-1 gap-3 rounded-xl border border-[#E5E9E4] p-4 sm:grid-cols-[1fr_1fr_120px_auto]"
                  >
                    <label>
                      <span className="mb-1 block text-xs font-medium text-[#7B857D]">
                        Taille
                      </span>
                      <input
                        value={variant.size}
                        onChange={(event) =>
                          updateVariant(index, "size", event.target.value)
                        }
                        placeholder="Ex. M"
                        className="w-full rounded-lg border border-[#E5E9E4] bg-[#F5F6F4] px-3 py-2.5 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                      />
                    </label>

                    <label>
                      <span className="mb-1 block text-xs font-medium text-[#7B857D]">
                        Couleur
                      </span>
                      <input
                        value={variant.color}
                        onChange={(event) =>
                          updateVariant(index, "color", event.target.value)
                        }
                        placeholder="Ex. Noir"
                        className="w-full rounded-lg border border-[#E5E9E4] bg-[#F5F6F4] px-3 py-2.5 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                      />
                    </label>

                    <label>
                      <span className="mb-1 block text-xs font-medium text-[#7B857D]">
                        Stock
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={variant.stock}
                        onChange={(event) =>
                          updateVariant(index, "stock", event.target.value)
                        }
                        className="w-full rounded-lg border border-[#E5E9E4] bg-[#F5F6F4] px-3 py-2.5 text-sm text-[#252B27] outline-none focus:border-[#405C49]"
                      />
                    </label>

                    <div className="flex items-end">
                      {(!editingProduct || !variant.id) && (
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          disabled={draft.variants.length <= 1}
                          className="w-full rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          Retirer
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {editingProduct && (
                  <p className="text-xs text-[#7B857D]">
                    Les variantes existantes ne peuvent pas être supprimées
                    depuis cette page. Les nouvelles variantes peuvent être ajoutées.
                  </p>
                )}
              </div>
            )}

            {formError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-[#E5E9E4] pt-4">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl border border-[#E5E9E4] bg-white px-4 py-2.5 text-sm font-medium text-[#68736A] hover:bg-[#F5F6F4] disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#405C49] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#314936] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Enregistrement..."
                  : editingProduct
                    ? "Enregistrer les modifications"
                    : "Créer le produit"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Liste des produits */}
      <section className="overflow-hidden rounded-2xl border border-[#E5E9E4] bg-white">
        <div className="border-b border-[#E5E9E4] p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold text-[#252B27]">
                Liste des produits
              </h2>
              <p className="mt-1 text-sm text-[#7B857D]">
                {filteredProducts.length} produit(s) affiché(s)
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full rounded-xl border border-[#E5E9E4] bg-[#F5F6F4] px-4 py-2.5 text-sm text-[#252B27] outline-none transition placeholder:text-[#9AA39B] focus:border-[#405C49] lg:max-w-xs"
            />
          </div>

          {/* Filtres */}
          <div className="mt-4 flex flex-wrap gap-2">
            {(
              [
                ["all", "Tous"],
                ["available", "Disponibles"],
                ["low", "Stock faible"],
                ["out", "En rupture"],
              ] as [StockFilter, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  filter === value
                    ? "bg-[#405C49] text-white"
                    : "bg-[#F5F6F4] text-[#68736A] hover:bg-[#DCE9DF]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-10 text-center text-sm text-[#7B857D]">
            Chargement des produits...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-[#252B27]">
              Aucun produit trouvé
            </p>
            <p className="mt-1 text-sm text-[#7B857D]">
              Essaie une autre recherche ou un autre filtre.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[#F5F6F4] text-xs uppercase tracking-wide text-[#7B857D]">
                <tr>
                  <th className="px-5 py-4 font-semibold">Produit</th>
                  <th className="px-5 py-4 font-semibold">Prix</th>
                  <th className="px-5 py-4 font-semibold">Stock</th>
                  <th className="px-5 py-4 font-semibold">Statut</th>
                  <th className="px-5 py-4 font-semibold">Variantes</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E5E9E4]">
                {filteredProducts.map((product) => {
                  const stock = getProductStock(product);
                  const status = getStockLabel(stock);

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-[#FAFBF9]"
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#252B27]">
                          {product.name}
                        </p>
                        <p className="mt-1 text-xs text-[#7B857D]">
                          Réf. {product.code}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-[#252B27]">
                        {formatPrice(product.price)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#252B27]">
                        {stock}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        {product.hasVariants &&
                        product.variants &&
                        product.variants.length > 0 ? (
                          <div className="flex max-w-xs flex-wrap gap-1.5">
                            {product.variants.map((variant, index) => (
                              <span
                                key={variant.id ?? index}
                                className="rounded-lg bg-[#F5F6F4] px-2 py-1 text-xs text-[#68736A]"
                              >
                                {[variant.size, variant.color]
                                  .filter(Boolean)
                                  .join(" / ") || "Variante"}{" "}
                                · {variant.stock}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-[#9AA39B]">
                            Produit simple
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditForm(product)}
                            className="rounded-lg bg-[#F5F6F4] px-3 py-2 text-xs font-semibold text-[#405C49] hover:bg-[#DCE9DF]"
                          >
                            Modifier
                          </button>

                          <button
  type="button"
  onClick={() => setProductToDelete(product)}
  className="rounded-lg bg-[#DCE9DF] px-3 py-2 text-xs font-semibold text-[#405C49] transition hover:bg-[#C9DCCF]"
>
  Supprimer
</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
               )}
      </section>

      {/* Fenêtre de confirmation de suppression */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#252B27]/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E5E9E4] bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#DCE9DF]">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-[#405C49]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12M10 11v6m4-6v6M9 7l1-3h4l1 3m-9 0 1 13h10l1-13"
                />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-bold text-[#252B27]">
              Supprimer ce produit ?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#7B857D]">
              Veux-tu vraiment supprimer{" "}
              <strong className="font-semibold text-[#405C49]">
                {productToDelete.name}
              </strong>
              ? Cette action est définitive si le produit peut être supprimé.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setProductToDelete(null)}
                className="rounded-xl border border-[#E5E9E4] bg-white px-4 py-2.5 text-sm font-medium text-[#68736A] transition hover:bg-[#F5F6F4] disabled:opacity-50"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={deleting}
                onClick={() => void handleDelete()}
                className="rounded-xl bg-[#405C49] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#314936] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Suppression..." : "Confirmer"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}