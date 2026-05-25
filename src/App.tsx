import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChefHat,
  PackagePlus,
  Search,
  Trash2,
} from "lucide-react";

import "./App.css";
import {
  exportInventory,
  loadInventory,
  saveInventory,
} from "./lib/inventoryStorage";
import { buildRecipePrompt } from "./lib/recipePrompt";
import type { Category, InventoryItem, StorageZone } from "./types";

type ItemDraft = {
  name: string;
  quantity: string;
  unit: string;
  categoryId: string;
  expiresOn: string;
};

type CategoryDraft = {
  name: string;
  storage: StorageZone;
  color: string;
};

const itemDraftInitial: ItemDraft = {
  name: "",
  quantity: "1",
  unit: "pcs",
  categoryId: "fridge",
  expiresOn: "",
};

const categoryDraftInitial: CategoryDraft = {
  name: "",
  storage: "pantry",
  color: "#d6b98b",
};

const unitOptions = ["pcs", "packs", "bottles", "grams", "kg", "ml", "liters"];

const storageLabels: Record<StorageZone | "all", string> = {
  all: "All",
  fridge: "Fridge",
  pantry: "Pantry",
  freezer: "Freezer",
  counter: "Counter",
};

function createItemId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortCategories(categories: Category[]) {
  return [...categories].sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

function App() {
  const [snapshot, setSnapshot] = useState(() => loadInventory());
  const [selectedZone, setSelectedZone] = useState<StorageZone | "all">("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [itemDraft, setItemDraft] = useState<ItemDraft>(itemDraftInitial);
  const [categoryDraft, setCategoryDraft] =
    useState<CategoryDraft>(categoryDraftInitial);
  const [copiedState, setCopiedState] = useState<"idle" | "copied">("idle");

  useEffect(() => {
    saveInventory(snapshot);
  }, [snapshot]);

  useEffect(() => {
    if (copiedState !== "copied") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => setCopiedState("idle"), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [copiedState]);

  const categories = useMemo(
    () => sortCategories(snapshot.categories),
    [snapshot.categories],
  );

  const categoryMap = useMemo(
    () =>
      Object.fromEntries(categories.map((category) => [category.id, category])),
    [categories],
  );

  const items = useMemo(
    () =>
      [...snapshot.items].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [snapshot.items],
  );

  const visibleCategories = useMemo(() => {
    if (selectedZone === "all") {
      return categories;
    }

    return categories.filter((category) => category.storage === selectedZone);
  }, [categories, selectedZone]);

  const activeCategoryId = useMemo(() => {
    if (selectedCategoryId === "all") {
      return "all";
    }

    const category = categoryMap[selectedCategoryId];
    if (!category) {
      return "all";
    }

    if (selectedZone !== "all" && category.storage !== selectedZone) {
      return "all";
    }

    return selectedCategoryId;
  }, [categoryMap, selectedCategoryId, selectedZone]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const category = categoryMap[item.categoryId];
      const matchesZone =
        selectedZone === "all" || category?.storage === selectedZone;
      const matchesCategory =
        activeCategoryId === "all" || item.categoryId === activeCategoryId;
      const matchesQuery =
        query.length === 0 ||
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        category?.name.toLowerCase().includes(query.toLowerCase());

      return matchesZone && matchesCategory && matchesQuery;
    });
  }, [activeCategoryId, categoryMap, items, query, selectedZone]);

  const zoneCounts = useMemo(() => {
    return items.reduce<Record<StorageZone, number>>(
      (counts, item) => {
        const category = categoryMap[item.categoryId];
        if (category) {
          counts[category.storage] += 1;
        }
        return counts;
      },
      { fridge: 0, pantry: 0, freezer: 0, counter: 0 },
    );
  }, [categoryMap, items]);

  const expiringSoon = useMemo(() => {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return items.filter((item) => {
      if (!item.expiresOn) {
        return false;
      }

      const expiry = new Date(item.expiresOn);
      return expiry >= today && expiry <= nextWeek;
    }).length;
  }, [items]);

  const prompt = useMemo(
    () => buildRecipePrompt(items, categories),
    [categories, items],
  );

  function handleZoneSelect(zone: StorageZone | "all") {
    setSelectedZone(zone);
  }

  function handleDraftChange<Key extends keyof ItemDraft>(
    key: Key,
    value: ItemDraft[Key],
  ) {
    setItemDraft((current) => ({ ...current, [key]: value }));
  }

  function handleCategoryDraftChange<Key extends keyof CategoryDraft>(
    key: Key,
    value: CategoryDraft[Key],
  ) {
    setCategoryDraft((current) => ({ ...current, [key]: value }));
  }

  function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = itemDraft.name.trim();
    if (!trimmedName) {
      return;
    }

    const newItem: InventoryItem = {
      id: createItemId(),
      name: trimmedName,
      quantity: itemDraft.quantity.trim() || "1",
      unit: itemDraft.unit.trim() || "pcs",
      categoryId: itemDraft.categoryId,
      expiresOn: itemDraft.expiresOn,
      createdAt: new Date().toISOString(),
    };

    setSnapshot((current) => ({
      ...current,
      items: [newItem, ...current.items],
    }));
    setItemDraft((current) => ({
      ...itemDraftInitial,
      categoryId: current.categoryId,
    }));
  }

  function handleAddCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = categoryDraft.name.trim();
    if (!trimmedName) {
      return;
    }

    const categoryId = trimmedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (
      !categoryId ||
      snapshot.categories.some((category) => category.id === categoryId)
    ) {
      return;
    }

    const nextCategory: Category = {
      id: categoryId,
      name: trimmedName,
      color: categoryDraft.color,
      storage: categoryDraft.storage,
    };

    setSnapshot((current) => ({
      ...current,
      categories: [...current.categories, nextCategory],
    }));
    setItemDraft((current) => ({ ...current, categoryId: nextCategory.id }));
    setCategoryDraft(categoryDraftInitial);
  }

  function handleDeleteItem(itemId: string) {
    setSnapshot((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }));
  }

  async function handleCopyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = prompt;
      textArea.setAttribute("readonly", "true");
      textArea.style.position = "absolute";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    setCopiedState("copied");
    window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
  }

  function handleExport() {
    exportInventory(snapshot);
  }

  return (
    <main className="min-h-screen bg-stone-50 text-stone-900">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-3 rounded-[28px] bg-white p-3 shadow-sm sm:p-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h1 className="font-['Space_Grotesk'] text-2xl font-bold text-stone-950">
                Fridge
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                {items.length} items
                {expiringSoon > 0 ? `, ${expiringSoon} expiring soon` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopyPrompt}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-4 text-sm font-medium text-white"
            >
              <ChefHat className="h-4 w-4" />
              {copiedState === "copied" ? "Copied" : "Copy prompt"}
            </button>
          </header>

          <form
            onSubmit={handleAddItem}
            className="grid gap-3 rounded-3xl border border-stone-200 bg-stone-50 p-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr] sm:items-end"
          >
            <label className="grid gap-2 text-sm text-stone-600 sm:col-span-3">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
                Add item
              </span>
              <input
                value={itemDraft.name}
                onChange={(event) =>
                  handleDraftChange("name", event.target.value)
                }
                placeholder="Tomatoes, milk, pasta..."
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-600">
              <span className="sr-only">Quantity</span>
              <input
                value={itemDraft.quantity}
                onChange={(event) =>
                  handleDraftChange("quantity", event.target.value)
                }
                placeholder="1"
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
              />
            </label>
            <label className="grid gap-2 text-sm text-stone-600">
              <span className="sr-only">Unit</span>
              <select
                value={itemDraft.unit}
                onChange={(event) =>
                  handleDraftChange("unit", event.target.value)
                }
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
              >
                {unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-stone-600">
              <span className="sr-only">Category</span>
              <select
                value={itemDraft.categoryId}
                onChange={(event) =>
                  handleDraftChange("categoryId", event.target.value)
                }
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-stone-600 sm:col-span-2">
              <span className="sr-only">Expiration date</span>
              <input
                type="date"
                value={itemDraft.expiresOn}
                onChange={(event) =>
                  handleDraftChange("expiresOn", event.target.value)
                }
                className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
              />
            </label>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-900 px-4 text-sm font-medium text-white sm:col-span-3"
            >
              <PackagePlus className="h-4 w-4" />
              Add
            </button>
          </form>

          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
              className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white pl-11 pr-4 text-sm outline-none transition focus:border-stone-400"
            />
          </label>

          <section className="space-y-2">
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {(["all", "fridge", "pantry", "freezer", "counter"] as const).map(
                (zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => handleZoneSelect(zone)}
                    className={`whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium transition ${
                      selectedZone === zone
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    {storageLabels[zone]}
                    {zone !== "all" ? ` ${zoneCounts[zone]}` : ""}
                  </button>
                ),
              )}
            </div>

            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryId("all")}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                  activeCategoryId === "all"
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-white text-stone-600"
                }`}
              >
                All categories
              </button>
              {visibleCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                    activeCategoryId === category.id
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-white text-stone-600"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          <details className="rounded-3xl border border-stone-200 bg-stone-50 p-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-stone-700">
              More options
            </summary>
            <div className="mt-3 grid gap-3">
              <div className="rounded-2xl bg-white p-3">
                <p className="text-sm font-medium text-stone-800">
                  New category
                </p>
                <form
                  onSubmit={handleAddCategory}
                  className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
                >
                  <input
                    value={categoryDraft.name}
                    onChange={(event) =>
                      handleCategoryDraftChange("name", event.target.value)
                    }
                    placeholder="Beans"
                    className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
                  />
                  <select
                    value={categoryDraft.storage}
                    onChange={(event) =>
                      handleCategoryDraftChange(
                        "storage",
                        event.target.value as StorageZone,
                      )
                    }
                    className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-stone-400"
                  >
                    <option value="pantry">Pantry</option>
                    <option value="fridge">Fridge</option>
                    <option value="freezer">Freezer</option>
                    <option value="counter">Counter</option>
                  </select>
                  <input
                    type="color"
                    value={categoryDraft.color}
                    onChange={(event) =>
                      handleCategoryDraftChange("color", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-stone-200 bg-white p-2"
                  />
                  <button
                    type="submit"
                    className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700 sm:col-span-3"
                  >
                    Save category
                  </button>
                </form>
              </div>

              <div className="rounded-2xl bg-white p-3">
                <p className="text-sm font-medium text-stone-800">Backup</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="min-h-12 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-medium text-stone-700"
                  >
                    Export JSON
                  </button>
                  <div className="text-xs leading-5 text-stone-500 sm:self-center">
                    Data stays only on this phone or browser.
                  </div>
                </div>
              </div>
            </div>
          </details>

          <section className="grid gap-3">
            {filteredItems.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-5 py-10 text-center text-sm text-stone-500">
                No items here.
              </div>
            ) : (
              filteredItems.map((item) => {
                const category = categoryMap[item.categoryId];

                return (
                  <article
                    key={item.id}
                    className="inventory-card flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-['Space_Grotesk'] text-xl font-bold text-stone-950">
                        {item.name}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-sm text-stone-500">
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">
                          {item.quantity} {item.unit}
                        </span>
                        <span className="rounded-full bg-stone-100 px-3 py-1 text-stone-700">
                          {category?.name ?? "Unknown"}
                        </span>
                        {item.expiresOn ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-3 py-1 text-stone-700">
                            <CalendarDays className="h-3.5 w-3.5" />
                            {item.expiresOn}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 px-4 text-sm font-medium text-stone-600"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </article>
                );
              })
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

export default App;
