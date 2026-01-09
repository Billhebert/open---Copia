import { PluginManifest } from '../../domain/plugins/PluginManifest.js';

export interface PluginRegistryPort {
  /**
   * Registra um plugin
   */
  register(manifest: PluginManifest): Promise<void>;

  /**
   * Remove um plugin
   */
  unregister(pluginId: string): Promise<void>;

  /**
   * Busca um plugin por ID
   */
  findById(pluginId: string): Promise<PluginManifest | null>;

  /**
   * Lista todos os plugins
   */
  listAll(): Promise<PluginManifest[]>;

  /**
   * Lista plugins habilitados para um tenant
   */
  listEnabledForTenant(tenantId: string): Promise<PluginManifest[]>;

  /**
   * Lista plugins disponíveis para um scope
   */
  listForScope(tenantId: string, scope: {
    userId?: string;
    roles?: string[];
    department?: string;
    subdepartment?: string;
  }): Promise<PluginManifest[]>;

  /**
   * Habilita um plugin para um tenant
   */
  enableForTenant(tenantId: string, pluginId: string, config?: Record<string, any>): Promise<void>;

  /**
   * Desabilita um plugin para um tenant
   */
  disableForTenant(tenantId: string, pluginId: string): Promise<void>;

  /**
   * Atualiza configuração de um plugin para um tenant
   */
  updateTenantConfig(tenantId: string, pluginId: string, config: Record<string, any>): Promise<void>;
}
