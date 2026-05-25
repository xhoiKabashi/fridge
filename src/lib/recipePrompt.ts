import type { Category, InventoryItem } from "../types";

export function buildRecipePrompt(
  items: InventoryItem[],
  categories: Category[],
) {
  if (items.length === 0) {
    return [
      "You are my home cooking assistant.",
      "My inventory is currently empty.",
      "Suggest a short grocery list of versatile ingredients I should buy for quick meals this week.",
    ].join("\n");
  }

  const groupedItems = categories
    .map((category) => {
      const categoryItems = items.filter(
        (item) => item.categoryId === category.id,
      );
      if (categoryItems.length === 0) {
        return null;
      }

      const lines = categoryItems.map((item) => {
        const expiryText = item.expiresOn
          ? `, expires on ${item.expiresOn}`
          : "";
        return `- ${item.name}: ${item.quantity} ${item.unit}${expiryText}`;
      });

      return `${category.name}\n${lines.join("\n")}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return [
    "You are my home cooking assistant.",
    "Use only or mostly the ingredients I already have at home.",
    "Suggest 5 practical recipes I can make today.",
    "Prioritize ingredients that expire soon and avoid wasting food.",
    "For each recipe, include a short title, a short ingredient list, and compact step-by-step instructions.",
    "Also add 2 ultra-fast snack or breakfast ideas from the same ingredients.",
    "",
    "My home inventory:",
    groupedItems,
  ].join("\n");
}
