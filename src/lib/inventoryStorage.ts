import type { Category, InventoryItem, InventorySnapshot } from "../types";

const STORAGE_KEY = "fridge-inventory-v1";

const builtInCategories: Category[] = [
  {
    id: "produce",
    name: "Fruits & Veg",
    color: "#ff8a3d",
    storage: "counter",
    builtIn: true,
  },
  {
    id: "fridge",
    name: "Fridge Staples",
    color: "#58c7ff",
    storage: "fridge",
    builtIn: true,
  },
  {
    id: "dairy",
    name: "Dairy",
    color: "#7a9cff",
    storage: "fridge",
    builtIn: true,
  },
  {
    id: "meat",
    name: "Meats",
    color: "#ff6b6b",
    storage: "freezer",
    builtIn: true,
  },
  {
    id: "freezer",
    name: "Frozen",
    color: "#7be0d6",
    storage: "freezer",
    builtIn: true,
  },
  {
    id: "oil-sauce",
    name: "Oils & Sauces",
    color: "#f4c95d",
    storage: "pantry",
    builtIn: true,
  },
  {
    id: "pasta-rice",
    name: "Pasta & Rice",
    color: "#ffcf8b",
    storage: "pantry",
    builtIn: true,
  },
  {
    id: "cans",
    name: "Cans & Dry Goods",
    color: "#9d8cff",
    storage: "pantry",
    builtIn: true,
  },
  {
    id: "bakery",
    name: "Bakery",
    color: "#ff9f68",
    storage: "counter",
    builtIn: true,
  },
  {
    id: "spices",
    name: "Spices",
    color: "#6dd3a0",
    storage: "pantry",
    builtIn: true,
  },
];

const starterItems: InventoryItem[] = [
  {
    id: "item-eggs",
    name: "Eggs",
    quantity: "12",
    unit: "pcs",
    categoryId: "fridge",
    expiresOn: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-pasta",
    name: "Penne pasta",
    quantity: "2",
    unit: "packs",
    categoryId: "pasta-rice",
    expiresOn: "",
    createdAt: new Date().toISOString(),
  },
  {
    id: "item-garlic",
    name: "Garlic",
    quantity: "1",
    unit: "bulb",
    categoryId: "produce",
    expiresOn: "",
    createdAt: new Date().toISOString(),
  },
];

const starterSnapshot: InventorySnapshot = {
  categories: builtInCategories,
  items: starterItems,
};

function cloneSnapshot(snapshot: InventorySnapshot): InventorySnapshot {
  return {
    categories: snapshot.categories.map((category) => ({ ...category })),
    items: snapshot.items.map((item) => ({ ...item })),
  };
}

export function loadInventory(): InventorySnapshot {
  const fallback = cloneSnapshot(starterSnapshot);
  let raw: string | null = null;

  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return fallback;
  }

  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<InventorySnapshot>;
    return {
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : fallback.categories,
      items: Array.isArray(parsed.items) ? parsed.items : fallback.items,
    };
  } catch {
    return fallback;
  }
}

export function saveInventory(snapshot: InventorySnapshot) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
}

export function exportInventory(snapshot: InventorySnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "fridge-inventory-backup.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getBuiltInCategories() {
  return builtInCategories;
}
