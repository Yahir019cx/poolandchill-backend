import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto';

@ApiTags('Invitation')
@Controller('invitation')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Crear invitación',
    description: 'Endpoint público para registrar una invitación con nombre y correo electrónico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Invitación creada exitosamente',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Juan Pérez' },
        email: { type: 'string', example: 'juan@example.com' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos de entrada inválidos' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  async create(@Body() dto: CreateInvitationDto) {
    return this.invitationService.createInvitation(dto);
  }
}
