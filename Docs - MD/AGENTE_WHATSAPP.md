# Agente de Denúncia por WhatsApp (LinhaMap)

Assistente que recebe mensagens de WhatsApp, registra denúncias de estrada na API do
LinhaMap (fazendo o ponto aparecer no mapa) e responde o cidadão — tudo orquestrado no
**n8n** com a **WAHA** como ponte do WhatsApp.

- **Workflow n8n:** `LinhaMap` (`id A5dYy1r3P40MKBRY`).
- **Canal:** WAHA (não-oficial, conecta por QR).
- **Backend:** reusa `POST /api/reports` (a categoria/severidade é classificada pela IA do backend).
- **Detalhes técnicos da integração:** ver `docs/integracao-whatsapp-n8n.md`.

---

## Palavra-chave (obrigatória)

O agente **só age** se a mensagem **começar** com a palavra-chave exata:

> **`linhamap-hackathon`**

Qualquer mensagem **sem** essa palavra é **ignorada** (não gera resposta). Isso protege o
número de reagir a conversas normais. _(A palavra é configurável numa constante do nó Code.)_

---

## Os comportamentos do agente

Depois da palavra-chave, o agente decide entre:

1. **Registrar** — se identificar uma **Linha** no texto → cria a denúncia e confirma.
2. **Ensinar (ajuda)** — se for uma **saudação** ou pedido de ajuda → manda um tutorial.
3. **Pedir a linha** — se descreveu um problema mas **sem** a linha → pede a linha.

> Mensagens de **grupo** são **sempre ignoradas** (nem registram, nem respondem).

---

## Lista de mensagens aceitas e resultado

> Todas começam com `linhamap-hackathon`. Os exemplos de problema podem variar — o que
> importa é **conter o nome/número da Linha** para registrar.

### ✅ Registram denúncia (precisa ter a Linha)

| Mensagem (exemplo) | Trecho identificado | Resposta do bot |
|---|---|---|
| `linhamap-hackathon muita lama na ponte da C-65` | Ponte do Branco (C-65) | "Recebido! Registramos sua denúncia e já avisamos os vizinhos e a Secretaria de Obras. Obrigado!" |
| `linhamap-hackathon buraco grande na C-70` | Igarapé Verde (C-70) | idem |
| `linhamap-hackathon ponte cedendo na C-65 perto da serra` | Curva da Serra (C-65) | idem |
| `linhamap-hackathon erosão na Linha Gaúcha` | Travessão 40 | idem |
| `linhamap-hackathon atolou na C-60` | Sítio Boa Vista (C-60) | idem |
| `linhamap-hackathon lama na C-75` | Laticínio (C-75) | idem |
| `linhamap-hackathon ponte ruim na Linha 60` | Atravessa Igarapé (Linha 60) | idem |
| `linhamap-hackathon buraco na Linha 57,5` | Cafezal Alto (Linha 57,5) | idem |
| `linhamap-hackathon salve, tem buraco na C-70` | Igarapé Verde (C-70) | idem _(a Linha tem prioridade sobre a saudação)_ |

### 💬 Recebem o tutorial (saudação / ajuda, sem Linha)

| Mensagem (exemplo) | Resposta do bot |
|---|---|
| `linhamap-hackathon` _(só a palavra-chave)_ | Tutorial de como denunciar |
| `linhamap-hackathon opa` | Tutorial |
| `linhamap-hackathon oi` / `oie` / `bom dia` / `boa tarde` / `boa noite` | Tutorial |
| `linhamap-hackathon tudo bem` / `tudo bom` / `beleza` / `blz` / `de boa` | Tutorial |
| `linhamap-hackathon eae` / `e aí` / `salve` / `fala` / `alô` / `qual foi` | Tutorial |
| `linhamap-hackathon ajuda` / `menu` / `como funciona` | Tutorial |
| `linhamap-hackathon como faço uma denúncia?` | Tutorial |
| `linhamap-hackathon quero denunciar` | Tutorial |

**Texto do tutorial enviado:**
```
Olá! Sou o assistente do *LinhaMap*. Eu registro problemas nas estradas de terra e aviso a Secretaria de Obras.

Para denunciar, mande assim:
*linhamap-hackathon* + o que houve + a Linha

Exemplo:
linhamap-hackathon muita lama na ponte da C-65

Linhas: C-60, C-65, C-70, C-75, Linha 60, Linha 57,5, Linha Gaúcha. Você também pode mandar a sua localização.
```

### ❓ Pedem a Linha (problema sem Linha)

| Mensagem (exemplo) | Resposta do bot |
|---|---|
| `linhamap-hackathon tem um buraco enorme aqui` | "Entendi o problema! Só me diga em qual Linha foi (ex.: C-65) que eu registro. Mande: linhamap-hackathon tem um buraco enorme aqui na C-65" |
| `linhamap-hackathon a estrada está intransitável` | idem (repete o texto + " na C-65") |

### 🚫 Ignoradas (nenhuma ação, nenhuma resposta)

| Mensagem | Motivo |
|---|---|
| `oi, tudo bem?` / qualquer texto **sem** `linhamap-hackathon` | Não tem a palavra-chave |
| Qualquer mensagem enviada em **grupo** | Grupos são descartados sempre |

---

## Linhas disponíveis (nome → trecho no mapa)

A denúncia só vira ponto no mapa se a mensagem citar uma destas linhas:

| Linha | Trecho |
|---|---|
| **C-60** | Sítio Boa Vista |
| **C-65** | Ponte do Branco _(padrão)_ · Curva da Serra _(se citar "serra"/"curva")_ |
| **C-70** | Igarapé Verde |
| **C-75** | Laticínio |
| **Linha 60** | Atravessa Igarapé |
| **Linha 57,5** | Cafezal Alto |
| **Linha Gaúcha** | Travessão 40 |

---

## Observações

- **Classificação automática:** o tipo (buraco, lama, ponte, etc.) e a gravidade são definidos
  pela **IA do backend** a partir do texto — o agente não pergunta isso.
- **Relator:** denúncias via Zap aparecem no painel como **"Enviada via WhatsApp"** (ou o nome
  do contato + "(via WhatsApp)" quando o WhatsApp informa o nome).
- **Score do mapa congelado:** em produção (`DEMO_MODE`), denúncias **não alteram** o score
  curado dos trechos — então vários testes não desconfiguram a demo (a denúncia é registrada e
  aparece no dashboard, mas o risco do trecho fica estável).
- **Maiúsculas/acentos:** a palavra-chave não diferencia maiúsculas; as linhas são reconhecidas
  com ou sem acento (ex.: "gaucha" e "gaúcha").
