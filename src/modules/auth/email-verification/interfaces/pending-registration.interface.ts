/**
 * Interface para los datos de registro pendiente de verificación
 */
export interface PendingRegistration {
  registrationId: number;
  email: string;
  firstName: string;
  lastName: string;
  verificationToken: string;
  tokenExpiresAt: Date;
  createdAt: Date;
}

/**
 * Interface para la respuesta del SP xsp_CreatePendingRegistration
 */
export interface CreatePendingRegistrationResult {
  registrationId: number;
  errorMessage: string | null;
}

/**
 * Interface para la respuesta del SP xsp_VerifyEmailToken
 */
export interface VerifyEmailTokenResult {
  userId: number;
  email: string;
  isEmailVerified: boolean;
  firstName: string;
  lastName: string;
  roles: string | null;
  errorMessage: string | null;
}

/**
 * Interface para la respuesta de registro exitoso
 */
export interface RegisterResponse {
  success: boolean;
  message: string;
}

/**
 * Interface para la respuesta de verificación exitosa
 */
export interface VerificationResponse {
  success: boolean;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  sessionToken: string; // Token temporal de un solo uso
}
