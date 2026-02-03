import Link from "next/link"
import { Heart } from "lucide-react"

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container flex h-14 items-center px-4">
                <Link href="/" className="flex items-center space-x-2">
                    <Heart className="h-6 w-6 text-primary" fill="currentColor" />
                    <span className="font-bold text-lg tracking-tight">Kokoro Worksheet</span>
                </Link>
            </div>
        </header>
    )
}
