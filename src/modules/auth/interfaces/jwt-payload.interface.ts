/**
 * Payload del Access Token JWT
 * Este payload se incluye en cada token y se usa para autenticar requests
 */
export interface JwtPayload {
  /** Subject - ID del usuario (GUID) */
  sub: string;

  /** Email del usuario */
  email: string;

  /** Roles del usuario (ej: ['guest', 'host']) */
  roles: string[];

  /** Timestamp de emisión (generado automáticamente por JWT) */
  iat?: number;

  /** Timestamp de expiración (generado automáticamente por JWT) */
  exp?: number;
}

/**
 * Datos del usuario extraídos del token JWT
 * Se adjunta al request después de validar el token
 */
export interface JwtUser {
  userId: string;
  email: string;
  roles: string[];
}
