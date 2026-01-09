export interface AuthContext {
  tenantId: string;
  tenantSlug: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  roles: string[];
  tags: string[];
  departmentId?: string;
  department?: string;
  subdepartment?: string;
  // Para BYO Key
  useUserKey: boolean;
  // Scope calculado
  scope: AuthScope;
}

export interface AuthScope {
  departments: string[];
  subdepartments: string[];
  tags: string[];
  roles: string[];
}

export interface TokenPayload {
  tenantId: string;
  userId?: string;
  type: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface ApiKeyInfo {
  type: 'tenant' | 'user';
  tenantId: string;
  userId?: string;
  vaultKeyId?: string;
}

export function createAuthContext(
  tenantId: string,
  tenantSlug: string,
  userId?: string,
  userEmail?: string,
  userName?: string,
  roles: string[] = [],
  tags: string[] = [],
  departmentId?: string,
  department?: string,
  subdepartment?: string,
  useUserKey = false
): AuthContext {
  return {
    tenantId,
    tenantSlug,
    userId,
    userEmail,
    userName,
    roles,
    tags,
    departmentId,
    department,
    subdepartment,
    useUserKey,
    scope: {
      departments: department ? [department] : [],
      subdepartments: subdepartment ? [subdepartment] : [],
      tags,
      roles,
    },
  };
}

export function hasRole(ctx: AuthContext, role: string): boolean {
  return ctx.roles.includes(role);
}

export function hasAnyRole(ctx: AuthContext, roles: string[]): boolean {
  return roles.some(role => ctx.roles.includes(role));
}

export function hasTag(ctx: AuthContext, tag: string): boolean {
  return ctx.tags.includes(tag);
}

export function hasDepartment(ctx: AuthContext, dept: string): boolean {
  return ctx.department === dept;
}
