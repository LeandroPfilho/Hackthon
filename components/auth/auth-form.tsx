"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Landmark,
  LoaderCircle,
  Lock,
  Mail,
  Sprout,
  User,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

type Mode = "login" | "signup";

const PASSWORD_MIN = 6;

/** Perfis oferecidos no cadastro da demo (didático — cada um lista o que faz). */
const PROFILES: {
  role: UserRole;
  icon: typeof Sprout;
  title: string;
  subtitle: string;
  abilities: string[];
}[] = [
  {
    role: "cidadao",
    icon: Sprout,
    title: "Comunidade",
    subtitle: "morador / produtor",
    abilities: [
      "Registrar denúncia",
      "Seguir trechos e receber alertas",
      "Mapa de risco e planejar trajeto",
    ],
  },
  {
    role: "secretaria",
    icon: Landmark,
    title: "Secretaria de Obras",
    subtitle: "gestão pública",
    abilities: [
      "Tudo da Comunidade, e mais:",
      "Dashboard e mapa de calor",
      "Ordens de serviço",
      "Relatórios e resolver denúncias",
    ],
  },
];

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("cidadao");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (isSignup) {
      if (password.length < PASSWORD_MIN) {
        setError(`A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`);
        return;
      }
      if (password !== confirm) {
        setError("As senhas não coincidem.");
        return;
      }
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    try {
      if (isSignup) {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { role, full_name: name.trim() || null } },
        });
        if (err) throw err;
        // Sem confirmação de e-mail → já vem sessão; senão, pede verificação.
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        // Leva a pessoa direto ao que o perfil escolhido desbloqueia.
        const dest = nextParam || (role === "secretaria" ? "/dashboard" : "/resumo");
        router.push(dest);
        router.refresh();
        return;
      }

      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      router.push(nextParam || (await destinationForSession()));
      router.refresh();
    } catch (err) {
      setError(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2 className="h-10 w-10 text-primary" />
          <h2 className="text-lg font-bold">Confirme seu e-mail</h2>
          <p className="text-sm text-muted-foreground">
            Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele e
            depois faça login.
          </p>
          <Button asChild variant="outline">
            <Link href="/login">Ir para o login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-8 text-center lg:text-left">
        <h1 className="text-3xl font-bold tracking-tight">
          {isSignup ? "Criar conta" : "Acessar plataforma"}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isSignup
            ? "Junte-se à rede de monitoramento das linhas vicinais."
            : "Bem-vindo de volta ao LinhaMap."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {isSignup && (
          <Field
            id="name"
            label="Nome completo"
            icon={<User className="h-4 w-4" />}
            type="text"
            autoComplete="name"
            value={name}
            onChange={setName}
            placeholder="João da Silva"
          />
        )}

        <Field
          id="email"
          label="E-mail"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={setEmail}
          placeholder="voce@exemplo.com"
        />

        {isSignup && (
          <div className="flex flex-col gap-2">
            <Label>Como você vai usar o LinhaMap?</Label>
            <div className="grid grid-cols-2 gap-2">
              {PROFILES.map((p) => {
                const selected = role === p.role;
                const Icon = p.icon;
                return (
                  <button
                    type="button"
                    key={p.role}
                    onClick={() => setRole(p.role)}
                    aria-pressed={selected}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-input hover:bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-md",
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-semibold leading-tight">{p.title}</span>
                    <span className="text-xs text-muted-foreground">{p.subtitle}</span>
                  </button>
                );
              })}
            </div>
            {/* Mostra o que o perfil selecionado pode fazer (objetivo didático). */}
            <ul className="mt-1 flex flex-col gap-1 rounded-lg bg-muted/60 p-3 text-sm">
              {PROFILES.find((p) => p.role === role)!.abilities.map((a, i) => (
                <li key={a} className="flex items-start gap-2">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      i === 0 && role === "secretaria" ? "bg-transparent" : "bg-primary",
                    )}
                  />
                  <span className={cn(i === 0 && role === "secretaria" && "font-medium")}>
                    {a}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field
          id="password"
          label="Senha"
          icon={<Lock className="h-4 w-4" />}
          type="password"
          required
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
        />

        {isSignup && (
          <Field
            id="confirm"
            label="Confirmar senha"
            icon={<Lock className="h-4 w-4" />}
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
            placeholder="••••••••"
          />
        )}

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <LoaderCircle className="animate-spin" />
          ) : isSignup ? (
            <>
              Criar minha conta <UserPlus />
            </>
          ) : (
            <>
              Entrar <ArrowRight />
            </>
          )}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        {isSignup ? (
          <>
            Já tem conta?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Entrar
            </Link>
          </>
        ) : (
          <>
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-primary hover:underline">
              Cadastre-se
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

/** Input com rótulo e ícone à esquerda (padrão do design Stitch). */
function Field({
  id,
  label,
  icon,
  value,
  onChange,
  ...props
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "id">) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
        <Input
          id={id}
          className="pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          {...props}
        />
      </div>
    </div>
  );
}

/** Após login, leva a Secretaria ao back-office e o cidadão à sua conta. */
async function destinationForSession(): Promise<string> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    const data = await res.json();
    return data?.role === "secretaria" ? "/dashboard" : "/resumo";
  } catch {
    return "/resumo";
  }
}

/** Traduz os erros mais comuns do Supabase Auth para PT-BR. */
function translateAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/Invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/User already registered/i.test(msg)) return "Este e-mail já tem conta. Faça login.";
  if (/Password should be at least/i.test(msg))
    return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (/Unable to validate email address/i.test(msg)) return "E-mail inválido.";
  if (/Email not confirmed/i.test(msg))
    return "Confirme seu e-mail antes de entrar (verifique sua caixa de entrada).";
  return `Não foi possível concluir: ${msg}`;
}
