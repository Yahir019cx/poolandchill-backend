import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminService } from './admin.service';
import { ApprovePropertyDto, RejectPropertyDto, SuspendPropertyDto } from './dto';

@ApiTags('Admin - Properties')
@Controller('admin/properties')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth('JWT-auth')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar propiedades pendientes de revisión',
    description: 'Obtiene las propiedades en estado PENDING_REVIEW para aprobar o rechazar.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página (default: 1)' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, description: 'Tamaño de página (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de propiedades pendientes',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            totalCount: { type: 'number', example: 15 },
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 20 },
            properties: { type: 'array', items: { type: 'object' } },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async getPendingProperties(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.adminService.getPendingProperties(page || 1, pageSize || 20);
  }

  @Post('approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Aprobar propiedad',
    description: 'Aprueba una propiedad pendiente de revisión. Cambia el estado a ACTIVE.',
  })
  @ApiResponse({
    status: 200,
    description: 'Propiedad aprobada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Propiedad aprobada.' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Propiedad no encontrada o no está pendiente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async approveProperty(
    @Request() req: any,
    @Body() dto: ApprovePropertyDto,
  ) {
    const adminId = req.user.userId;
    return this.adminService.approveProperty(adminId, dto.propertyId);
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rechazar propiedad',
    description: 'Rechaza una propiedad pendiente de revisión. Requiere motivo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Propiedad rechazada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Propiedad rechazada.' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Propiedad no encontrada o no está pendiente' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async rejectProperty(
    @Request() req: any,
    @Body() dto: RejectPropertyDto,
  ) {
    const adminId = req.user.userId;
    return this.adminService.rejectProperty(adminId, dto.propertyId, dto.reason);
  }

  @Post('suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspender propiedad',
    description: 'Suspende una propiedad activa o pausada. Requiere motivo.',
  })
  @ApiResponse({
    status: 200,
    description: 'Propiedad suspendida',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Propiedad suspendida.' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Propiedad no encontrada o no puede ser suspendida' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async suspendProperty(
    @Request() req: any,
    @Body() dto: SuspendPropertyDto,
  ) {
    const adminId = req.user.userId;
    return this.adminService.suspendProperty(adminId, dto.propertyId, dto.reason);
  }
}
