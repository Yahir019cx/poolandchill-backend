import {
  Controller,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PropertiesStatusService } from './properties-status.service';
import { ChangeStatusDto, DeletePropertyDto } from '../dto';

@ApiTags('Properties')
@Controller('properties/owner')
export class PropertiesStatusController {
  constructor(private readonly statusService: PropertiesStatusService) {}

  @Post('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cambiar estado de propiedad (Owner)',
    description: 'Pausar (4) o reactivar (3) una propiedad. Solo el dueño puede cambiar el estado.',
  })
  @ApiResponse({ status: 200, description: 'Estado cambiado exitosamente' })
  @ApiResponse({ status: 400, description: 'Error al cambiar estado' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async changeStatus(
    @Request() req: any,
    @Body() dto: ChangeStatusDto,
  ) {
    const userId = req.user.userId;
    return this.statusService.changeStatus(userId, dto.propertyId, dto.status);
  }

  @Post('delete')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Eliminar propiedad (Owner)',
    description: 'Elimina una propiedad. Solo el dueño puede eliminar.',
  })
  @ApiResponse({ status: 200, description: 'Propiedad eliminada' })
  @ApiResponse({ status: 400, description: 'Error al eliminar' })
  @ApiResponse({ status: 403, description: 'No tienes permisos para esta acción' })
  async delete(
    @Request() req: any,
    @Body() dto: DeletePropertyDto,
  ) {
    const userId = req.user.userId;
    return this.statusService.deleteProperty(userId, dto.propertyId);
  }
}
