import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AuthModule } from '../auth/auth.module';
import { EmailModule } from '../../web/email/email.module';

/**
 * Módulo de administración
 *
 * Gestiona propiedades desde el panel admin:
 * - GET /admin/properties/pending - Listar pendientes de revisión
 * - POST /admin/properties/:id/approve - Aprobar propiedad
 * - POST /admin/properties/:id/reject - Rechazar propiedad
 * - POST /admin/properties/:id/suspend - Suspender propiedad
 *
 * Requiere rol: admin, superadmin, support o moderator
 */
@Module({
  imports: [AuthModule, EmailModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRoleGuard],
  exports: [AdminRoleGuard],
})
export class AdminModule {}
