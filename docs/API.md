# API Headless - Rifa Do Cipriano

Base path:

```text
/api/v1
```

## Publico

### Autenticacao do administrador

```http
POST /api/v1/auth/register
POST /api/v1/auth/login
```

Registro:

```json
{
  "nome": "Wesley Cliente",
  "email": "wesley@cliente.com",
  "password": "senha-segura-123",
  "whatsapp": "65999999999"
}
```

Login:

```json
{
  "email": "wesley@cliente.com",
  "password": "senha-segura-123"
}
```

Resposta:

```json
{
  "data": {
    "admin": {
      "id": "uuid",
      "nome": "Wesley Cliente",
      "email": "wesley@cliente.com",
      "whatsapp": "65999999999"
    },
    "token": "jwt"
  }
}
```

Use o token nas rotas do painel:

```http
Authorization: Bearer jwt
```

### Detalhar campanha para pagina externa

```http
GET /api/v1/campanhas/:slug
```

Alias tambem disponivel:

```http
GET /api/v1/campanha/:slug
```

Resposta:

```json
{
  "data": {
    "id": "uuid",
    "titulo": "Grande Rifa Do Cipriano",
    "slug": "grande-rifa-do-cipriano",
    "descricao": "Concorra a premios incriveis.",
    "valor_cota": 10,
    "total_cotas": 10000,
    "status": "ativo",
    "imagem_url": "https://...",
    "cotas": [
      {
        "numero": 1,
        "label": "001",
        "status": "disponivel",
        "disponivel": true,
        "reservado": false,
        "pago": false
      }
    ],
    "numeros_ocupados": [5, 12],
    "numeros_reservados": [5],
    "numeros_pagos": [12],
    "resumo_cotas": {
      "disponiveis": 9990,
      "reservadas": 5,
      "pagas": 5
    }
  }
}
```

### Reservar pedido

```http
POST /api/v1/pedidos/reservar
Content-Type: application/json
```

Alias tambem disponivel:

```http
POST /api/v1/pedido/criar
```

Reserva por numeros escolhidos:

```json
{
  "campanha_id": "uuid",
  "nome_comprador": "Joao Silva",
  "whatsapp_comprador": "65999999999",
  "cotas": [1, 2, 3]
}
```

Reserva automatica por quantidade:

```json
{
  "campanha_id": "uuid",
  "nome_comprador": "Joao Silva",
  "whatsapp_comprador": "65999999999",
  "quantidade_cotas": 5
}
```

Alias tambem aceitos: `quantidade` e `quantidadeCotas`.

Resposta:

```json
{
  "success": true,
  "message": "Reserva criada com sucesso.",
  "data": {
    "id": "uuid",
    "campanha_id": "uuid",
    "status_pagamento": "pendente",
    "cotas": [1, 2, 3],
    "quantidade_cotas": 3,
    "chance_percentual": 0.03,
    "chance_percentual_label": "0.03%",
    "valor_total": 30,
    "expires_at": "2026-06-27T19:45:00.000Z"
  }
}
```

### Consultar status do pedido

```http
GET /api/v1/pedidos/status/:pedido_id
```

Resposta:

```json
{
  "data": {
    "id": "uuid",
    "campanha_id": "uuid",
    "status_pagamento": "pendente",
    "pago": false,
    "expirado": false,
    "valor_total": 30,
    "cotas_reservadas": [1, 2, 3],
    "expires_at": "2026-06-27T19:45:00.000Z",
    "paid_at": null
  }
}
```

### Esteira de vendas da campanha

```http
GET /api/v1/campanhas/:slug/esteira
```

Retorna os ultimos 10 pedidos pagos da campanha para prova social na landing page.

Resposta:

```json
{
  "data": [
    {
      "id": "uuid",
      "comprador": "Felipe A.",
      "percentual": 0.6,
      "percentual_label": "0,6%",
      "cotas": 60,
      "timestamp": "2026-06-28T12:00:00.000Z"
    }
  ]
}
```

Endpoint SSE preparado para atualizacoes em tempo real quando um webhook marcar pedido como pago:

```http
GET /api/v1/campanhas/:slug/esteira/stream
```

### Area do Comprador global

```http
POST /api/v1/comprador/consultar
Content-Type: application/json
```

Busca em todo o sistema os pedidos pagos vinculados ao WhatsApp informado,
independente do dono da rifa.

Body:

```json
{
  "whatsapp": "65999999999"
}
```

Resposta:

```json
{
  "data": [
    {
      "dono_rifa": "Rifa do Cipriano",
      "campanha": {
        "id": "uuid",
        "titulo": "Grande Rifa do Cipriano",
        "slug": "grande-rifa-do-cipriano",
        "total_cotas": 10000
      },
      "quantidade_cotas": 60,
      "chance_percentual": 0.6,
      "chance_label": "0,6%"
    }
  ]
}
```

## Concorrencia

A reserva usa a tabela `cotas_campanha` com chave unica por `campanha_id + numero`.
O endpoint `/pedidos/reservar` roda em transacao PostgreSQL com isolamento `Serializable`.

Fluxo:

1. Libera reservas pendentes expiradas.
2. Garante que as cotas da campanha existem.
3. Cria o pedido como `pendente`.
4. Atualiza apenas cotas com status `disponivel`.
5. Se a quantidade atualizada for menor que a solicitada, a transacao e revertida.

Isso impede que duas pessoas reservem/paguem o mesmo numero ao mesmo tempo.

## Webhook de pagamento

```http
POST /api/v1/webhooks/pagamento
```

O endpoint valida a assinatura do Mercado Pago (`x-signature` + `x-request-id`) usando
`MERCADO_PAGO_WEBHOOK_SECRET`. Quando o pagamento consultado no gateway estiver como
`approved`, o pedido e suas cotas reservadas sao marcados como `pago`.

## Admin

Todas as rotas abaixo exigem token JWT de administrador, exceto os aliases
`POST /api/v1/admin/register` e `POST /api/v1/admin/login`.

### Registro e login do dono da rifa

```http
POST /api/v1/admin/register
POST /api/v1/admin/login
```

Alias legado para registro:

```http
POST /api/v1/admin/usuarios-clientes
```

### Campanhas

```http
GET /api/v1/admin/campanhas
POST /api/v1/admin/campanhas
PUT /api/v1/admin/campanhas/:id
DELETE /api/v1/admin/campanhas/:id
```

As consultas do painel sao filtradas automaticamente pelo `admin_id` do token.

O `POST` aceita campos em `camelCase` ou `snake_case`:

```http
POST /api/v1/admin/campanhas
Authorization: Bearer jwt
Content-Type: multipart/form-data
```

Campos:

```text
titulo=Rifei iPhone 15 Pro Max
valor_cota=10.00
total_cotas=10000
imagem=@iphone.png
```

O backend gera o `slug` automaticamente, evita duplicidade e salva a campanha
com `status=ativo`, vinculada ao `admin_id` do token.

### Rifinhas

```http
GET /api/v1/admin/rifinhas
POST /api/v1/admin/rifinhas
DELETE /api/v1/admin/rifinhas/:id
```

Exemplo:

```json
{
  "campanha_id": "uuid",
  "titulo": "Rifinha de R$500",
  "total_cotas": 1000,
  "status": "ativo"
}
```

### Pedidos

```http
GET /api/v1/admin/pedidos
GET /api/v1/admin/pedidos?campanha_id=uuid&status_pagamento=pendente
```

### Dashboard

```http
GET /api/v1/admin/dashboard/stats
Authorization: Bearer jwt
```

Resposta:

```json
{
  "data": {
    "campanhas_ativas": 8,
    "pedidos_hoje": 126,
    "receita_pendente": 4280,
    "receita_pendente_formatada": "R$ 4.280,00",
    "cotas_vendidas": 18400,
    "cotas_vendidas_formatada": "18.400"
  }
}
```
