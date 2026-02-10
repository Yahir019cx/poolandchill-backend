import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: sql.ConnectionPool | null = null;
  private connecting: Promise<sql.ConnectionPool> | null = null;
  private isReconnecting = false;

  constructor(private readonly configService: ConfigService) { }

  private getConfig(): sql.config {
    return {
      server: this.configService.get<string>('DB_HOST', ''),
      database: this.configService.get<string>('DB_NAME', ''),
      user: this.configService.get<string>('DB_USER', ''),
      password: this.configService.get<string>('DB_PASS', ''),
      options: {
        port: Number(this.configService.get<string>('DB_PORT', '1433')),
        encrypt: false,               
        trustServerCertificate: true, 
      },
      pool: {
        max: 10,
        min: 1,
        idleTimeoutMillis: 30000,
      },
    };
  }


  async getConnection(): Promise<sql.ConnectionPool> {
    if (this.pool?.connected) {
      return this.pool;
    }

    if (this.connecting) {
      return this.connecting;
    }

    this.connecting = this.connectWithRetry();

    try {
      this.pool = await this.connecting;
      return this.pool;
    } finally {
      this.connecting = null;
    }
  }

  private async connectWithRetry(): Promise<sql.ConnectionPool> {
    const label = this.isReconnecting ? 'Reconexión' : 'Conexión';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const config = this.getConfig();
        const pool = new sql.ConnectionPool(config);

        pool.on('error', (err) => {
          this.logger.error(`Pool error: ${err.message}`);
          this.pool = null;
          this.handleDisconnect();
        });

        await pool.connect();

        return pool;
      } catch (error) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        this.logger.error(
          `${label} fallida (intento ${attempt}/${MAX_RETRIES}): ${error.message}`,
        );

        if (attempt === MAX_RETRIES) {
          this.logger.error(
            `Fallo definitivo: no se pudo conectar a SQL Server después de ${MAX_RETRIES} intentos`,
          );
          this.isReconnecting = false;
          throw error;
        }

        this.logger.warn(`Reintentando en ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    throw new Error('No se pudo conectar a SQL Server');
  }

  private handleDisconnect(): void {
    if (this.connecting) return;

    this.isReconnecting = true;
    this.logger.warn('Desconexión detectada. Iniciando reconexión automática...');

    this.connecting = this.connectWithRetry();
    this.connecting
      .then((pool) => {
        this.pool = pool;
      })
      .catch((err) => {
        this.logger.error(`Reconexión automática fallida: ${err.message}`);
      })
      .finally(() => {
        this.connecting = null;
      });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async executeStoredProcedure<T = any>(
    spName: string,
    inputs: { name: string; type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams; value: any }[],
    outputs: { name: string; type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams }[],
  ): Promise<{ recordset: T[]; output: Record<string, any> }> {
    const pool = await this.getConnection();
    const request = pool.request();

    for (const input of inputs) {
      request.input(input.name, input.type, input.value);
    }

    for (const output of outputs) {
      request.output(output.name, output.type);
    }

    const result = await request.execute(spName);

    return {
      recordset: result.recordset as T[],
      output: result.output,
    };
  }

  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.logger.log('Conexión a SQL Server cerrada');
    }
  }
}
