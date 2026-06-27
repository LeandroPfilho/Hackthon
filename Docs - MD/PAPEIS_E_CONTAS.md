# LinhaMap — Papéis e Contas

> Controle de acesso por papel (RBAC) introduzido para separar **quem denuncia**
> de **quem resolve**. Complementa a autenticação (cadastro/login via Supabase Auth).

## Papéis

| Papel        | Quem é                         | O que acessa |
| ------------ | ------------------------------ | ------------ |
| `cidadao`    | Produtor/morador (padrão)      | Mapa, Trajeto, **Denúncia**, "Minha conta" (minhas denúncias, follows, notificações) |
| `secretaria` | Secretaria de Obras (operador) | Tudo do cidadão **+ back-office**: Dashboard, Relatórios, Ordens de serviço, mudar status de denúncia, recalcular trechos, exportar CSV |

Por padrão toda conta nova nasce `cidadao` (trigger `on_auth_user_created`) e a
promoção a `secretaria` é **manual**.

> ⚠️ **Modo demo (hackathon):** a tela de **cadastro** deixa a pessoa escolher o
> perfil ("Comunidade" ou "Secretaria de Obras") para conhecer os dois lados do
> produto. Isto permite qualquer um se cadastrar como secretaria — **intencional só para a
> demo**. Para produção real, o ideal é remover essa opção.
