import { BudgetPort, Budget } from '../../application/ports/BudgetPort.js';

export class MockBudgetPort implements BudgetPort {
  private budgets: Map<string, Budget> = new Map();

  async create(budget: Omit<Budget, 'id' | 'used' | 'createdAt' | 'updatedAt'>): Promise<Budget> {
    const id = `budget_${Date.now()}`;
    const newBudget: Budget = {
      ...budget,
      id,
      used: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.budgets.set(id, newBudget);
    return newBudget;
  }

  async findTenantBudget(tenantId: string, type: 'token' | 'cost'): Promise<Budget | null> {
    // Retorna null (sem budget configurado = ilimitado)
    return null;
  }

  async findUserBudget(userId: string, type: 'token' | 'cost'): Promise<Budget | null> {
    // Retorna null (sem budget configurado = ilimitado)
    return null;
  }

  async incrementUsage(budgetId: string, amount: number): Promise<Budget> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }
    budget.used += amount;
    budget.updatedAt = new Date();
    return budget;
  }

  async isExceeded(budgetId: string): Promise<boolean> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      return false;
    }
    return budget.used >= budget.limit;
  }

  async resetExpiredBudgets(): Promise<number> {
    let count = 0;
    const now = new Date();
    for (const [id, budget] of this.budgets) {
      if (budget.resetAt && budget.resetAt < now) {
        budget.used = 0;
        budget.updatedAt = now;
        count++;
      }
    }
    return count;
  }

  async updateLimit(budgetId: string, newLimit: number): Promise<Budget> {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      throw new Error('Budget not found');
    }
    budget.limit = newLimit;
    budget.updatedAt = new Date();
    return budget;
  }

  async delete(budgetId: string): Promise<void> {
    this.budgets.delete(budgetId);
  }
}
