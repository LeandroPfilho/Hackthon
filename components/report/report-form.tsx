"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Upload, WifiOff } from "lucide-react";
import { toast } from "sonner";

import { RiskBadge } from "@/components/risk-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReport } from "@/lib/api-client";
import { CATEGORY_LABELS, SEVERITY_LABELS } from "@/lib/labels";
import { saveOfflineReport } from "@/lib/offline";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  type Report,
  type ReportCategory,
  type ReportSeverity,
} from "@/lib/types";

const fieldClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

// Limites de validação dos campos da denúncia.
const NAME_MAX = 60;
const PHONE_MAX = 11; // dígitos (DDD + 9 dígitos)
const DESC_MIN = 10;
const DESC_MAX = 1000;

/** Mantém apenas letras (com acento) e espaços — nome não tem número nem símbolo. */
function sanitizeName(value: string): string {
  return value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s]/g, "").slice(0, NAME_MAX);
}

/** Mantém apenas dígitos, no máximo 11 (DDD + número). */
function sanitizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(0, PHONE_MAX);
}

/** Formata os dígitos para exibição no padrão (69) 9 9999-9999. */
function formatPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, PHONE_MAX);
  if (!d) return "";
  let out = "(" + d.slice(0, 2);
  if (d.length === 2) out += ")";
  if (d.length > 2) out += ") " + d.slice(2, 3);
  if (d.length > 3) out += " " + d.slice(3, 7);
  if (d.length > 7) out += "-" + d.slice(7, 11);
  return out;
}

type SegmentOption = { id: string; name: string; rural_line: string };

export function ReportForm({
  segments,
  preselectedSegmentId,
}: {
  segments: SegmentOption[];
  preselectedSegmentId?: string;
}) {
  const [form, setForm] = useState({
    reporter_name: "",
    phone: "",
    road_segment_id: preselectedSegmentId ?? "",
    latitude: "",
    longitude: "",
    description: "",
    category: "" as "" | ReportCategory,
    severity: "" as "" | ReportSeverity,
  });
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Mostra o atalho "Minhas denúncias" só quando há sessão (senão iria pro login).
  const [authed, setAuthed] = useState(false);

  // Conexão (para o banner e o caminho offline). Inicia `true` (SSR-safe) e é
  // sincronizado no cliente.
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => active && setAuthed(Boolean(d?.authenticated)))
      .catch(() => active && setAuthed(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setError("Geolocalização não suportada neste navegador.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("latitude", pos.coords.latitude.toFixed(6));
        set("longitude", pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        setError(
          "Não foi possível obter a localização. Tente novamente ou selecione o trecho acima.",
        );
        setLocating(false);
      },
    );
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      setError("Imagem muito grande (máx. 2 MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageData(reader.result as string);
      setImageName(file.name);
    };
    reader.readAsDataURL(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const description = form.description.trim();
    if (description.length < DESC_MIN) {
      setError(`Descreva o problema com pelo menos ${DESC_MIN} caracteres.`);
      return;
    }
    if (form.phone && form.phone.length < 10) {
      setError("Telefone incompleto: informe DDD + número (10 ou 11 dígitos).");
      return;
    }
    setSubmitting(true);

    const payload = {
      reporter_name: form.reporter_name || null,
      phone: form.phone || null,
      road_segment_id: form.road_segment_id || null,
      latitude: form.latitude ? Number(form.latitude) : null,
      longitude: form.longitude ? Number(form.longitude) : null,
      description: form.description,
      image_url: imageData,
      category: form.category || undefined,
      severity: form.severity || undefined,
    };

    // Offline: guarda no dispositivo (IndexedDB). O useOfflineSync envia sozinho
    // quando a conexão voltar.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        await saveOfflineReport(payload);
        toast.success(
          "Denúncia salva no seu celular. Vamos enviar sozinho quando a internet voltar.",
        );
        setForm((f) => ({ ...f, description: "", category: "", severity: "" }));
        setImageData(null);
        setImageName(null);
      } catch {
        setError("Não foi possível salvar a denúncia no dispositivo.");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    try {
      const created = await createReport(payload);
      setResult(created);
    } catch (err) {
      setError(`Não foi possível enviar a denúncia: ${String(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  // --- Tela de sucesso ---
  if (result) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-bold">Denúncia registrada!</h2>
          <p className="text-sm text-muted-foreground">
            Obrigado por contribuir. A ocorrência foi classificada automaticamente e o risco
            do trecho foi atualizado.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              {CATEGORY_LABELS[result.category]}
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
              Severidade: {SEVERITY_LABELS[result.severity]}
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <Button asChild>
              <Link href="/mapa">Ver no mapa</Link>
            </Button>
            {authed && (
              <Button asChild variant="outline">
                <Link href="/conta">Minhas denúncias</Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setForm((f) => ({ ...f, description: "", category: "", severity: "" }));
                setImageData(null);
                setImageName(null);
              }}
            >
              Nova denúncia
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      {!online && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            <strong>Modo Offline:</strong> suas denúncias serão salvas no dispositivo e enviadas
            automaticamente quando houver conexão.
          </span>
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nome do produtor ou morador">
          <Input
            value={form.reporter_name}
            onChange={(e) => set("reporter_name", sanitizeName(e.target.value))}
            placeholder="Seu nome"
            maxLength={NAME_MAX}
            autoComplete="name"
          />
        </Field>
        <Field label="Telefone / WhatsApp">
          <Input
            value={formatPhone(form.phone)}
            onChange={(e) => set("phone", sanitizePhone(e.target.value))}
            placeholder="(69) 9 9999-9999"
            inputMode="numeric"
            maxLength={16}
            autoComplete="tel"
          />
        </Field>
      </div>

      <Field label="Linha vicinal / trecho">
        <select
          className={fieldClass}
          value={form.road_segment_id}
          onChange={(e) => set("road_segment_id", e.target.value)}
        >
          <option value="">Selecione o trecho</option>
          {segments.map((s) => (
            <option key={s.id} value={s.id}>
              {s.rural_line} — {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Localização">
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={useMyLocation}
            disabled={locating}
            className="sm:w-fit"
          >
            {locating ? <LoaderCircle className="animate-spin" /> : <MapPin />}
            Usar minha localização
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={form.latitude}
              readOnly
              tabIndex={-1}
              placeholder="Latitude"
              aria-label="Latitude (preenchida automaticamente)"
              className="cursor-not-allowed bg-muted text-muted-foreground"
            />
            <Input
              value={form.longitude}
              readOnly
              tabIndex={-1}
              placeholder="Longitude"
              aria-label="Longitude (preenchida automaticamente)"
              className="cursor-not-allowed bg-muted text-muted-foreground"
            />
          </div>
        </div>
      </Field>

      <Field label="Descrição do problema *">
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value.slice(0, DESC_MAX))}
          placeholder="Ex.: Muita lama na descida da ponte, caminhão quase atolou."
          rows={4}
          maxLength={DESC_MAX}
        />
        <span className="self-end text-xs text-muted-foreground">
          {form.description.length}/{DESC_MAX}
        </span>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Categoria (opcional — IA classifica)">
          <select
            className={fieldClass}
            value={form.category}
            onChange={(e) => set("category", e.target.value as ReportCategory | "")}
          >
            <option value="">Automático (IA)</option>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severidade (opcional)">
          <select
            className={fieldClass}
            value={form.severity}
            onChange={(e) => set("severity", e.target.value as ReportSeverity | "")}
          >
            <option value="">Automático (IA)</option>
            {REPORT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Foto da ocorrência (opcional)">
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed border-input p-4 text-sm text-muted-foreground transition-colors hover:bg-accent">
          <Upload className="h-5 w-5" />
          <span>{imageName ?? "Selecionar imagem (máx. 2 MB)"}</span>
          <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        </label>
        {imageData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageData}
            alt="Pré-visualização"
            className="mt-2 max-h-40 rounded-md border object-cover"
          />
        )}
      </Field>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={submitting}>
        {submitting ? <LoaderCircle className="animate-spin" /> : <CheckCircle2 />}
        Enviar denúncia
      </Button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
