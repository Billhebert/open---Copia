export interface Budget {
  id: string;
  tenantId: string;
  userId?: string;
  type: 'token' | 'cost';
  limit: number;
  used: number;
  period: 'daily' | 'monthly' | 'total';
  resetAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetPort {
  /**
   * Cria um orçamento
   */
  create(budget: Omit<Budget, 'id' | 'used' | 'createdAt' | 'updatedAt'>): Promise<Budget>;

  /**
   * Busca orçamento do tenant
   */
  findTenantBudget(tenantId: string, type: 'token' | 'cost'): Promise<Budget | null>;

  /**
   * Busca orçamento do usuário
   */
  findUserBudget(userId: string, type: 'token' | 'cost'): Promise<Budget | null>;

  /**
   * Incrementa uso
   */
  incrementUsage(budgetId: string, amount: number): Promise<Budget>;

  /**
   * Verifica se o orçamento foi excedido
   */
  isExceeded(budgetId: string): Promise<boolean>;

  /**
   * Reseta orçamentos que precisam ser resetados
   */
  resetExpiredBudgets(): Promise<number>;

  /**
   * Atualiza limite
   */
  updateLimit(budgetId: string, newLimit: number): Promise<Budget>;

  /**
   * Deleta orçamento
   */
  delete(budgetId: string): Promise<void>;
}
