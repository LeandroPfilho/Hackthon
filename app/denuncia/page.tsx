import { InstallPwaButton } from "@/components/install-pwa-button";
import { ReportForm } from "@/components/report/report-form";
import { WhatsappCta } from "@/components/whatsapp-cta";
import { Card, CardContent } from "@/components/ui/card";
import { getRepository } from "@/lib/repository";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registrar Denúncia — LinhaMap",
};

/** Cadastro de denúncia colaborativa (Seção 6.4). */
export default async function DenunciaPage({
  searchParams,
}: {
  searchParams: { segment?: string };
}) {
  const repo = getRepository();
  const segments = (await repo.listSegments()).map((s) => ({
    id: s.id,
    name: s.name,
    rural_line: s.rural_line,
  }));

  return (
    <div className="container max-w-2xl py-12">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Registrar denúncia</h1>
        <p className="text-muted-foreground">
          Relate um problema em uma linha vicinal. Sua contribuição atualiza o risco do
          trecho e ajuda a Secretaria a priorizar a manutenção.
        </p>
        <InstallPwaButton label="Instalar o app no celular" className="mt-1 w-fit" />
      </div>

      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            📷 Sem sinal na sua linha? Tire a foto pelo celular e registre aqui assim que
            pegar Wi-Fi ou chegar na cidade.
          </p>
          <WhatsappCta
            label="Denunciar pelo WhatsApp"
            variant="outline"
            size="sm"
            className="shrink-0"
          />
        </CardContent>
      </Card>

      <ReportForm segments={segments} preselectedSegmentId={searchParams.segment} />
    </div>
  );
}
