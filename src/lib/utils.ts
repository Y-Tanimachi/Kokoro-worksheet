import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// shadcn/ui が参照するクラス名ユーティリティ（src/utils/cn.ts と同じ実装）
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
