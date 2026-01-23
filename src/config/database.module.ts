import { Global, Module } from '@nestjs/common';
import { DatabaseService } from './database.config';

/**
 * Módulo global de base de datos
 * Al ser @Global(), DatabaseService está disponible en toda la aplicación
 */
@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
