# Declaração de Uso de Inteligência Artificial

> Documento obrigatório conforme **Seção 8 do Edital** (Hackathon Extensionista IFRO Ariquemes
> 2026/1). Omitir uso relevante de IA pode levar à desclassificação (Seção 18, item "d").

Este projeto utilizou ferramentas de Inteligência Artificial como apoio ao desenvolvimento e como
funcionalidade do produto. Abaixo, a declaração transparente.

---

## 1. Ferramentas de IA utilizadas

| Ferramenta | Finalidade | Partes do projeto apoiadas |
| --- | --- | --- |
| Claude (Anthropic) — Claude Code | Arquitetura, geração e revisão de código, documentação | Aplicação Next.js (frontend + Route Handlers), SQL, README, scripts |
| Claude (Anthropic) — API multimodal | Classificação automática de denúncias por imagem/descrição (em runtime) | `POST /api/ai/classify-report` e `POST /api/reports` |
| Claude (Anthropic) — API de texto | Geração do resumo semanal para a Secretaria (em runtime) | `/api/ai/generate-weekly-summary` e `/api/dashboard/weekly-report` |

---

## 2. IA dentro do produto (em runtime)

O LinhaMap usa IA de forma **explicável e opcional**:

1. **Classificação de denúncias:** recebe foto/descrição e retorna categoria (buraco, lama, erosão,
   ponte danificada, atolamento, outro) + severidade, em JSON.
2. **Relatório semanal:** gera o resumo textual das ocorrências para a Secretaria de Obras.

> **Funciona sem IA:** sem `ANTHROPIC_API_KEY`, o sistema usa **fallback por regras** (palavras-chave
> na descrição), garantindo o funcionamento do MVP mesmo sem chaves externas.

O **Índice de Trafegabilidade** NÃO usa modelo caixa-preta: é uma **fórmula ponderada explicável**
(`lib/services/scoring.ts`), em conformidade com a regra de transparência do desafio.

---

## 3. Adaptações, revisões e validações da equipe

- [x] Todo o código gerado por IA foi **lido, compreendido e testado** pela equipe.
- [x] A equipe é capaz de **explicar e defender tecnicamente** cada parte da solução.
- [x] Nenhum dado sigiloso, credencial ou chave de API foi inserido em ferramentas externas.

---

_Última atualização: 22/06/2026_
