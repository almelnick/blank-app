"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isSignUp = mode === "sign-up"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message ?? "Algo salió mal")
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="min-h-svh bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-foreground">
            Pulse
          </span>
        </div>
        <Card className="p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              {isSignUp ? "Creá tu cuenta de agencia" : "Bienvenido de nuevo"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1 text-pretty">
              {isSignUp
                ? "La primera cuenta se convierte en administradora de la agencia."
                : "Ingresá para ver tus clientes y reportes."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={isSignUp ? "new-password" : "current-password"}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? "Procesando..."
                : isSignUp
                  ? "Crear cuenta"
                  : "Ingresar"}
            </Button>
          </form>

          <p className="text-sm text-muted-foreground text-center mt-6">
            {isSignUp ? "¿Ya tenés cuenta? " : "¿Sos el dueño de la agencia? "}
            <Link
              href={isSignUp ? "/sign-in" : "/sign-up"}
              className="text-foreground font-medium underline-offset-4 hover:underline"
            >
              {isSignUp ? "Ingresá" : "Creá tu cuenta"}
            </Link>
          </p>
        </Card>
        <p className="text-xs text-muted-foreground text-center mt-4 text-pretty">
          Los accesos de cada cliente los crea la agencia desde el panel.
        </p>
      </div>
    </main>
  )
}
