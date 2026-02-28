import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { BulkBetaInviteDto } from './dto';

@ApiTags('Bulk Email')
@Controller('admin/email')
export class BulkEmailController {
  constructor(private readonly adminService: AdminService) {}

  @Post('bulk-beta-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Envío masivo de invitación beta',
    description:
      'Envía un email de invitación a probar la app de Pool & Chill a una lista de correos.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado del envío masivo',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Enviados: 10, Fallidos: 0' },
        total: { type: 'number', example: 10 },
        sent: { type: 'number', example: 10 },
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
  async sendBulkBetaInvite(@Body() dto: BulkBetaInviteDto) {
    return this.adminService.sendBulkBetaInvite(dto.emails);
  }
}
