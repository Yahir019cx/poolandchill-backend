import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sql from 'mssql';

/**
 * Servicio centralizado para conexiones a SQL Server
 * Implementa connection pooling para mejor rendimiento
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool: sql.ConnectionPool | null = null;
  private connecting: Promise<sql.ConnectionPool> | null = null;

  constructor(private readonly configService: ConfigService) {}

  /**
   * Obtiene la configuración de conexión a SQL Server
   */
  private getConfig(): sql.config {
    return {
      server: this.configService.get<string>('DB_HOST', ''),
      database: this.configService.get<string>('DB_NAME', ''),
      user: this.configService.get<string>('DB_USER', ''),
      password: this.configService.get<string>('DB_PASS', ''),
      options: {
        encrypt: true,
        trustServerCertificate: false,
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
    };
  }

  /**
   * Obtiene una conexión del pool
   * Reutiliza la conexión existente o crea una nueva si no existe
   */
  async getConnection(): Promise<sql.ConnectionPool> {
    // Si ya hay un pool conectado, reutilizarlo
    if (this.pool?.connected) {
      return this.pool;
    }

    // Si hay una conexión en progreso, esperar a que termine
    if (this.connecting) {
      return this.connecting;
    }

    // Crear nueva conexión
    this.connecting = this.createConnection();

    try {
      this.pool = await this.connecting;
      return this.pool;
    } finally {
      this.connecting = null;
    }
  }

  /**
   * Crea una nueva conexión al pool
   */
  private async createConnection(): Promise<sql.ConnectionPool> {
    try {
      const config = this.getConfig();
      const pool = new sql.ConnectionPool(config);

      pool.on('error', (err) => {
        this.logger.error(`Database pool error: ${err.message}`);
        this.pool = null;
      });

      await pool.connect();
      this.logger.log('Conexión a SQL Server establecida');

      return pool;
    } catch (error) {
      this.logger.error(`Error al conectar a SQL Server: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ejecuta un stored procedure
   * @param spName - Nombre del SP (ej: '[security].[xsp_CreatePendingRegistration]')
   * @param inputs - Parámetros de entrada
   * @param outputs - Parámetros de salida
   */
  async executeStoredProcedure<T = any>(
    spName: string,
    inputs: { name: string; type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams; value: any }[],
    outputs: { name: string; type: sql.ISqlType | sql.ISqlTypeFactoryWithNoParams }[],
  ): Promise<{ recordset: T[]; output: Record<string, any> }> {
    const pool = await this.getConnection();
    const request = pool.request();

    // Agregar inputs
    for (const input of inputs) {
      request.input(input.name, input.type, input.value);
    }

    // Agregar outputs
    for (const output of outputs) {
      request.output(output.name, output.type);
    }

    const result = await request.execute(spName);

    return {
      recordset: result.recordset as T[],
      output: result.output,
    };
  }

  /**
   * Cierra la conexión al destruir el módulo
   */
  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.close();
      this.logger.log('Conexión a SQL Server cerrada');
    }
  }
}
