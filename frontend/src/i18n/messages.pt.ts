import type { MessageKey } from './messages.en'

/**
 * The European Portuguese (`pt-PT`) message catalogue. AO90 orthography, not
 * `pt-BR`.
 *
 * Typed `Record<MessageKey, string>` rather than `as const`: every key `en`
 * declares must be present here, and a typo'd key is a compile error — see
 * messages.en.ts and design.md, decision 2.
 */
export const pt: Record<MessageKey, string> = {
  // --- app.* — the shell ----------------------------------------------------
  'app.name': 'home_renov',
  'app.language': 'Idioma',
  'app.language.en': 'English',
  'app.language.pt-PT': 'Português',
  'app.connection.checking': 'A verificar…',
  'app.connection.title': 'Ligação ao servidor',
  'app.connection.failed.network': 'Não foi possível contactar a API. O servidor está em execução?',
  'app.connection.failed.server': 'A API devolveu um erro inesperado.',
  'app.connection.startHint':
    'Inicie a API com {command} a partir da raiz do repositório e recarregue a página.',

  // --- expenses.* — the screen, its table, its filters -----------------------
  'expenses.title': 'Despesas',
  'expenses.add': 'Adicionar despesa',
  'expenses.table.header.description': 'Descrição',
  'expenses.table.header.category': 'Categoria',
  'expenses.table.header.payee': 'Beneficiário',
  'expenses.table.header.incurredOn': 'Data',
  'expenses.table.header.status': 'Estado',
  'expenses.table.header.amount': 'Valor',
  'expenses.table.loading': 'A carregar despesas…',
  'expenses.table.retry': 'Tentar novamente',
  'expenses.table.empty':
    'Ainda não há despesas registadas. Adicione a primeira para começar a controlar os gastos.',
  'expenses.table.emptyFiltered':
    'Nenhuma despesa corresponde aos filtros atuais. Tente alargar o filtro de estado ou de categoria.',
  'expenses.filter.allStatuses': 'Todos os estados',
  'expenses.filter.allCategories': 'Todas as categorias',
  'expenses.error.network': 'Não foi possível contactar a API.',
  'expenses.error.server': 'A API devolveu um erro inesperado.',

  // --- expense.* — one expense: form, delete dialog, validation --------------
  'expense.field.description': 'Descrição',
  'expense.field.amount': 'Valor',
  'expense.field.incurredOn': 'Data',
  'expense.field.payee': 'Beneficiário',
  'expense.field.category': 'Categoria',
  'expense.field.paymentMethod': 'Método de pagamento',
  'expense.field.status': 'Estado',
  'expense.field.room': 'Divisão (opcional)',
  'expense.field.invoiceReference': 'Referência da fatura (opcional)',
  'expense.field.notes': 'Notas (opcional)',
  'expense.action.cancel': 'Cancelar',
  'expense.action.edit': 'Editar',
  'expense.action.delete': 'Eliminar',
  'expense.action.editNamed': 'Editar {description}',
  'expense.action.deleteNamed': 'Eliminar {description}',
  'expense.form.saving': 'A guardar…',
  'expense.form.editTitle': 'Editar despesa',
  'expense.form.saveChanges': 'Guardar alterações',
  'expense.error.network': 'Não foi possível contactar a API.',
  'expense.error.server': 'A API devolveu um erro inesperado.',
  'expense.error.descriptionLength': 'A descrição deve ter entre 1 e 200 carateres.',
  'expense.error.payeeLength': 'O beneficiário deve ter entre 1 e 120 carateres.',
  'expense.error.amountInvalid':
    'O valor deve ser um número positivo, com ponto decimal, por exemplo 250 ou 250.50.',
  'expense.error.dateRequired': 'Indique a data em que a despesa foi efetuada.',
  'expense.error.roomLength': 'A divisão deve ter no máximo 80 carateres.',
  'expense.error.invoiceReferenceLength': 'A referência da fatura deve ter no máximo 80 carateres.',
  'expense.error.notesLength': 'As notas devem ter no máximo 1000 carateres.',
  'expense.delete.title': 'Eliminar despesa',
  'expense.delete.confirm': 'Eliminar «{description}» ({payee})? Esta ação não pode ser anulada.',
  'expense.delete.deleting': 'A eliminar…',

  'expense.category.materials': 'Materiais',
  'expense.category.labour': 'Mão de obra',
  'expense.category.appliances': 'Eletrodomésticos',
  'expense.category.furniture_and_fixtures': 'Mobiliário e equipamento fixo',
  'expense.category.tools_and_equipment': 'Ferramentas e equipamento',
  'expense.category.permits_and_fees': 'Licenças e taxas',
  'expense.category.design_and_professional': 'Projeto e serviços técnicos',
  'expense.category.transport_and_delivery': 'Transporte e entrega',
  'expense.category.waste_disposal': 'Remoção de resíduos',
  'expense.category.utilities': 'Consumos',
  'expense.category.other': 'Outros',

  'expense.paymentMethod.cash': 'Numerário',
  'expense.paymentMethod.bank_transfer': 'Transferência bancária',
  'expense.paymentMethod.debit_card': 'Cartão de débito',
  'expense.paymentMethod.credit_card': 'Cartão de crédito',
  'expense.paymentMethod.direct_debit': 'Débito direto',
  'expense.paymentMethod.financing': 'Financiamento',
  'expense.paymentMethod.other': 'Outro',

  'expense.status.planned': 'Planeado',
  'expense.status.pending': 'Pendente',
  'expense.status.paid': 'Pago',

  // --- budget.* — the summary strip, the settings modal, validation ----------
  'budget.field.plannedBudget': 'Orçamento previsto',
  'budget.field.purchasePrice': 'Preço de compra',
  'budget.field.targetSalePrice': 'Preço de venda pretendido',
  'budget.summary.label': 'Resumo do orçamento',
  'budget.summary.title': 'Orçamento',
  'budget.summary.edit': 'Editar orçamento',
  'budget.summary.loadingTargets': 'A carregar orçamento…',
  'budget.summary.loadingSummary': 'A carregar resumo…',
  'budget.summary.targetsHeading': 'Objetivos',
  'budget.summary.spendHeading': 'Gastos',
  'budget.summary.emptyState':
    'Ainda não há orçamento definido. Utilize «{action}» acima para definir um orçamento previsto e acompanhar os gastos.',
  'budget.summary.expensesRecorded': 'Despesas registadas',
  'budget.summary.totalPaid': 'Total pago',
  'budget.summary.totalCommitted': 'Total comprometido',
  'budget.summary.totalForecast': 'Total previsto',
  'budget.summary.projectedProfit': 'Lucro estimado',
  'budget.summary.remaining': 'Orçamento restante',
  'budget.summary.overBudget': 'Acima do orçamento em',
  'budget.remaining.percentUsed': '{percent} do orçamento utilizado',
  'budget.settings.title': 'Definições do orçamento',
  'budget.settings.clearHint': 'Deixe em branco para limpar o objetivo.',
  'budget.action.cancel': 'Cancelar',
  'budget.action.save': 'Guardar orçamento',
  'budget.action.saving': 'A guardar…',
  'budget.error.network': 'Não foi possível contactar a API.',
  'budget.error.server': 'A API devolveu um erro inesperado.',
  // «O campo …» keeps article and gender agreement right whatever the label is.
  'budget.error.notANumber':
    'O campo «{field}» deve ser um número não negativo, com ponto decimal, por exemplo 45000 ou 45000.50.',
  'budget.error.tooLarge': 'O valor de «{field}» é demasiado elevado.',
}
