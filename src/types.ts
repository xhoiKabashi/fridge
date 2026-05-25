export type StorageZone = "fridge" | "pantry" | "freezer" | "counter";

export type Category = {
  id: string;
  name: string;
  color: string;
  storage: StorageZone;
  builtIn?: boolean;
};

export type InventoryItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
  categoryId: string;
  expiresOn: string;
  createdAt: string;
};

export type InventorySnapshot = {
  categories: Category[];
  items: InventoryItem[];
};
