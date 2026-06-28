const { z } = require('zod');

const uuid = z.string().uuid();
const whatsapp = z.string().trim().min(8).max(30).regex(/^[0-9+()\-\s]+$/);

const getCampanhaBySlugParams = z.object({
  slug: z.string().trim().min(3).max(180).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
}).strict();

const cotasArray = z.array(z.number().int().min(1)).min(1).max(100);

const reservarPedidoBody = z.object({
  campanha_id: uuid.optional(),
  campanhaId: uuid.optional(),
  nome_comprador: z.string().trim().min(2).max(160).optional(),
  nome: z.string().trim().min(2).max(160).optional(),
  compradorNome: z.string().trim().min(2).max(160).optional(),
  whatsapp_comprador: whatsapp.optional(),
  whatsapp: whatsapp.optional(),
  compradorWhatsapp: whatsapp.optional(),
  compradorEmail: z.string().trim().email().max(180).optional(),
  quantidade: z.number().int().min(1).max(100).optional(),
  quantidade_cotas: z.number().int().min(1).max(100).optional(),
  quantidadeCotas: z.number().int().min(1).max(100).optional(),
  cotas: cotasArray.optional(),
  numeros: cotasArray.optional(),
  cotasReservadas: cotasArray.optional(),
}).strict().superRefine((data, ctx) => {
  if (!data.campanha_id && !data.campanhaId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['campanha_id'], message: 'campanha_id e obrigatorio.' });
  }

  if (!data.nome_comprador && !data.nome && !data.compradorNome) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['nome_comprador'], message: 'nome_comprador e obrigatorio.' });
  }

  if (!data.whatsapp_comprador && !data.whatsapp && !data.compradorWhatsapp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['whatsapp_comprador'], message: 'whatsapp_comprador e obrigatorio.' });
  }

  const selectedSources = [data.cotas, data.numeros, data.cotasReservadas].filter(Boolean).length;
  const requestedQuantity = data.quantidade || data.quantidade_cotas || data.quantidadeCotas;

  if (!requestedQuantity && selectedSources === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cotas'], message: 'Informe cotas ou quantidade.' });
  }

  if (requestedQuantity && selectedSources > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantidade'], message: 'Use quantidade ou cotas escolhidas, nao ambos.' });
  }

  if ([data.quantidade, data.quantidade_cotas, data.quantidadeCotas].filter(Boolean).length > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['quantidade_cotas'], message: 'Use apenas um campo de quantidade.' });
  }

  if (selectedSources > 1) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cotas'], message: 'Use apenas um campo de cotas: cotas, numeros ou cotasReservadas.' });
  }
});

const pedidoStatusParams = z.object({
  pedido_id: uuid.optional(),
  id: uuid.optional(),
}).strict().superRefine((data, ctx) => {
  if (!data.pedido_id && !data.id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['pedido_id'], message: 'pedido_id e obrigatorio.' });
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
