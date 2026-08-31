import type { MetadataRoute } from "next";
import { ICON_PATH, MASKABLE_ICON_PATH } from "@/constants/icon";

// manifest.json のファイル規約から TS に変換し、アイコン参照を定数に集約している（issue #18）。
// 配信 URL は /manifest.webmanifest になるが、<link rel="manifest"> は Next.js が
// 自動生成するため、参照側の変更は不要。
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Kokoro Worksheet",
        short_name: "Kokoro",
        description: "自分の感情を整理するワークシート",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#ffffff",
        icons: [
            {
                src: ICON_PATH,
                sizes: "512x512",
                type: "image/png",
                purpose: "any",
            },
            {
                src: MASKABLE_ICON_PATH,
                sizes: "512x512",
                type: "image/png",
                purpose: "maskable",
            },
        ],
    };
}
