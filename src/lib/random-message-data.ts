export const RANDOM_MESSAGE_LIMITS = {
  body: 2000,
  source: 300,
} as const;

export const randomMessageCategories = ["quote", "fact", "joke", "prompt", "other"] as const;

export type RandomMessageCategory = (typeof randomMessageCategories)[number];

export type RandomMessage = {
  id: string;
  body: string;
  category: RandomMessageCategory;
  source: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RandomMessageInput = Pick<RandomMessage, "body" | "category" | "source" | "active">;

export function isRandomMessageCategory(value: unknown): value is RandomMessageCategory {
  return (
    typeof value === "string" && randomMessageCategories.includes(value as RandomMessageCategory)
  );
}
