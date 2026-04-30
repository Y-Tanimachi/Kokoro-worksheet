"use client"

import Link from "next/link"
import { Heart, LogIn, LogOut, User } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// 全ページ共通のスティッキーヘッダー
// ログイン状態に応じてアバタードロップダウン or ログインボタンを切り替える
export function Header() {
    const { user, signInWithGoogle, signOut } = useAuth()

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
            <div className="container flex h-14 items-center justify-between px-4">
                <Link href="/" className="flex items-center space-x-2">
                    <Heart className="h-6 w-6 text-primary" fill="currentColor" />
                    <span className="font-bold text-lg tracking-tight">Kokoro Worksheet</span>
                </Link>

                <div className="flex items-center gap-2">
                    {user ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                                        <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                                    </Avatar>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => signOut()}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>ログアウト</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button variant="ghost" size="sm" onClick={() => signInWithGoogle()}>
                            <LogIn className="mr-2 h-4 w-4" />
                            ログイン
                        </Button>
                    )}
                </div>
            </div>
        </header>
    )
}
