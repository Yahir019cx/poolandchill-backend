import {
  Controller,
  Get,
  Post,
  Body,
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
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DiditWebhookGuard } from './guards/didit-webhook.guard';
import { VerificationService } from './verification.service';
import { DiditWebhookDto } from './dto';

@ApiTags('Identity Verification')
@Controller('verification')
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  // ══════════════════════════════════════════════════
  // ENDPOINTS PARA EL USUARIO
  // ══════════════════════════════════════════════════

  @Post('start')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Iniciar verificación de identidad',
    description: `
      Inicia una sesión de verificación de identidad con Didit.
      Retorna una URL donde el usuario debe completar la verificación.

      **Flujo:**
      1. El usuario llama a este endpoint
      2. Se crea una sesión en Didit
      3. El usuario es redirigido a la URL de verificación
      4. Al completar, Didit notifica vía webhook
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Sesión de verificación creada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Sesión de verificación creada' },
        data: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', example: 'ses_abc123' },
            verificationUrl: {
              type: 'string',
              example: 'https://verify.didit.me/session/abc123',
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Error al crear sesión' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async startVerification(@Request() req: any) {
    const userId = req.user.userId;
    return this.verificationService.startVerification(userId);
  }

  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Consultar estado de verificación',
    description: 'Retorna el estado actual de verificación de identidad del usuario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estado de verificación',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            isVerified: { type: 'boolean', example: false },
            verificationStatus: { type: 'string', example: 'In Progress' },
            hasPendingSession: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  async getStatus(@Request() req: any) {
    const userId = req.user.userId;
    return this.verificationService.getVerificationStatus(userId);
  }

  // ══════════════════════════════════════════════════
  // WEBHOOK DE DIDIT
  // ══════════════════════════════════════════════════

  @Post('webhook/didit')
  @UseGuards(DiditWebhookGuard)
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // No mostrar en Swagger (es interno)
  async handleWebhook(@Body() payload: DiditWebhookDto) {
    return this.verificationService.processWebhook(payload);
  }
}
