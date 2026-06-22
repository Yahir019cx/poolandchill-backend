import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { AdminService } from './admin.service';
import { SendAdminEmailDto } from './dto';

@ApiTags('Admin - Email')
@Controller('admin/email')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
@ApiBearerAuth('JWT-auth')
export class BulkEmailController {
  constructor(private readonly adminService: AdminService) {}

  @Post('send-to-hosts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Enviar email personalizado a hosts',
    description:
      'Permite al admin escribir un asunto y mensaje personalizados y enviarlo a uno o varios hosts seleccionados.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado del envío',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Enviados: 3, Fallidos: 0' },
        total: { type: 'number', example: 3 },
        sent: { type: 'number', example: 3 },
        failed: { type: 'number', example: 0 },
        details: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              ok: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async sendToHosts(@Body() dto: SendAdminEmailDto) {
    return this.adminService.sendCustomEmailToHosts(dto.subject, dto.message, dto.hostEmails);
  }
}
