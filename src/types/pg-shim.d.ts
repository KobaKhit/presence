declare module "pg" {
  export class Pool {
    constructor(config?: { connectionString?: string });
    query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
    connect(): Promise<{
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
      release: () => void;
    }>;
    end(): Promise<void>;
  }
}
