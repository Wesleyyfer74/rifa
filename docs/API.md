# API Headless - Rifa Do Cipriano

Base path:

```text
/api/v1
```

## Publico

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
  "quantidade": 5
}
```

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
