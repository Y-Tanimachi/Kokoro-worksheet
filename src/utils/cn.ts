import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// 条件付きクラス名を clsx で結合し、Tailwindの競合クラス（例: p-2 と p-4）を twMerge で解決するユーティリティ
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
