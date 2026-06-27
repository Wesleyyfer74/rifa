const { z } = require('zod');

const uuid = z.string().uuid();
const whatsapp = z.string().trim().min(8).max(30).regex(/^[0-9+()\-\s]+$/);

const getCampanhaBySlugParams = z.object({
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

const reservarPedidoBody = z.object({
  campanha_id: uuid.optional(),
  campanhaId: uuid.optional(),
  nome: z.string().trim().min(2).max(160).optional(),
  compradorNome: z.string().trim().min(2).max(160).optional(),
  whatsapp: whatsapp.optional(),
  compradorWhatsapp: whatsapp.optional(),
  compradorEmail: z.string().trim().email().max(180).optional(),
  quantidade: z.number().int().min(1).max(100).optional(),
  numeros: z.array(z.number().int().min(1)).min(1).max(100).optional(),
  cotasReservadas: z.array(z.number().int().min(1)).min(1).max(100).optional(),
}).strict().superRefine((data, ctx) => {
  if (!data.campanha_id && !data.campanhaId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['campanha_id'], message: 'campanha_id é obrigatório.' });
  }

  if (!data.nome && !data.compradorNome) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nome'], message: 'nome é obrigatório.' });
  }

  if (!data.whatsapp && !data.compradorWhatsapp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['whatsapp'], message: 'whatsapp é obrigatório.' });
  }

  if (!data.quantidade && !data.numeros && !data.cotasReservadas) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantidade'], message: 'Informe quantidade ou números escolhidos.' });
  }

  if (data.quantidade && (data.numeros || data.cotasReservadas)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantidade'], message: 'Use quantidade ou números escolhidos, não ambos.' });
  }
});

const pedidoStatusParams = z.object({
  pedido_id: uuid.optional(),
  id: uuid.optional(),
}).strict().superRefine((data, ctx) => {
  if (!data.pedido_id && !data.id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pedido_id'], message: 'pedido_id é obrigatório.' });
  }
});

function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);

  if (!result.success) {
    const message = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    const error = new Error(message);
    error.statusCode = 422;
    throw error;
  }

  return result.data;
}

module.exports = {
  getCampanhaBySlugParams,
  reservarPedidoBody,
  pedidoStatusParams,
  parseOrThrow,
};
