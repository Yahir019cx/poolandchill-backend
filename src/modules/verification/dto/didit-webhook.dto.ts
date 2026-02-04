import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';

/**
 * DTO para el webhook de Didit
 * Recibe cuando el estado de verificación cambia
 */
export class DiditWebhookDto {
  @IsString()
  session_id: string;

  @IsString()
  status: string; // 'Approved' | 'Declined' | 'In Review' | 'Abandoned' | 'Not Started' | 'In Progress'

  @IsOptional()
  @IsString()
  vendor_data?: string; // Nuestro userId

  @IsOptional()
  @IsString()
  webhook_type?: string;

  @IsOptional()
  @IsNumber()
  timestamp?: number;

  @IsOptional()
  @IsNumber()
  created_at?: number;

  @IsOptional()
  @IsString()
  workflow_id?: string;

  @IsOptional()
  @IsObject()
  decision?: {
    kyc?: {
      verified: boolean;
      document_type?: string;
      document_number?: string;
      first_name?: string;
      last_name?: string;
      date_of_birth?: string;
      nationality?: string;
      country?: string;
    };
    face_match?: {
      verified: boolean;
      similarity_score?: number;
    };
    fraud_check?: {
      passed: boolean;
      reasons?: string[];
    };
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
