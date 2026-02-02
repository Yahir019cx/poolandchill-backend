import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import * as sql from 'mssql';
import { DatabaseService } from '../../../config/database.config';

@Injectable()
export class AdminRoleGuard implements CanActivate {
  constructor(private readonly databaseService: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }

    const hasPermission = await this.checkUserRole(userId);

    if (!hasPermission) {
      throw new ForbiddenException('No tienes permisos para esta acción.');
    }

    return true;
  }

  private async checkUserRole(userId: string): Promise<boolean> {
    const pool = await this.databaseService.getConnection();
    const request = pool.request();

    request.input('UserId', sql.UniqueIdentifier, userId);
    request.output('ErrorMessage', sql.NVarChar(500));

    const result = await request.execute('[security].[xsp_GetUserRoles]');
    const roles = result.recordset || [];
    const errorMessage = result.output.ErrorMessage;

    if (errorMessage) {
      throw new ForbiddenException(errorMessage);
    }

    // RoleCategory = 2 son roles administrativos, IsCurrentlyActive = 1 está activo
    return roles.some(
      (role: any) => role.RoleCategory === 2 && role.IsCurrentlyActive === 1,
    );
  }
}
