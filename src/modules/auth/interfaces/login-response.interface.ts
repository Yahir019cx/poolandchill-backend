/**
 * Datos del usuario retornados en la respuesta de login
 */
export interface LoginUserData {
  userId: string;
  email: string;
  phoneNumber: string | null;
  firstName: string;
  lastName: string;
  displayName: string | null;
  profileImageUrl: string | null;
  roles: string[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isAgeVerified: boolean;
  isIdentityVerified: boolean;
  isHost: boolean;
  isStaff: boolean;
  accountStatus: number;
  createdAt: Date;
  lastLoginAt: Date;
}

/**
 * Respuesta completa del endpoint de login
 */
export interface LoginResponse {
  /** Access Token JWT (15 minutos de validez) */
  accessToken: string;

  /** Refresh Token UUID (90 días de validez) */
  refreshToken: string;

  /** Tiempo de expiración del Access Token en segundos */
  expiresIn: number;

  /** Datos del usuario autenticado */
  user: LoginUserData;
}

/**
 * Respuesta del endpoint de refresh token
 */
export interface RefreshResponse {
  /** Nuevo Access Token JWT */
  accessToken: string;

  /** Tiempo de expiración del Access Token en segundos */
  expiresIn: number;
}

/**
 * Respuesta del endpoint de logout
 */
export interface LogoutResponse {
  success: boolean;
  message: string;
}

/**
 * Datos del usuario retornados por el SP de login
 */
export interface LoginSpUserData {
  UserId: string;
  Email: string;
  PhoneNumber: string | null;
  IsEmailVerified: boolean;
  IsPhoneVerified: boolean;
  IsAgeVerified: boolean;
  IsIdentityVerified: boolean;
  AccountStatus: number;
  CreatedAt: Date;
  LastLoginAt: Date;
  ProfileId: string | null;
  FirstName: string;
  LastName: string;
  DisplayName: string | null;
  Bio: string | null;
  ProfileImageUrl: string | null;
  DateOfBirth: Date | null;
  Gender: number | null;
  IsHostOnboarded: boolean;
  Roles: string; // Comma-separated: "guest,host"
  HasPassword: boolean;
  LinkedProviders: string | null; // Comma-separated: "google,facebook"
  IsHost: boolean;
  IsStaff: boolean;
  FailedLoginAttempts: number;
  LockedUntil: Date | null;
}

/**
 * Datos del usuario retornados por el SP de validación de refresh token
 */
export interface RefreshSpUserData {
  UserId: string;
  Email: string;
  AccountStatus: number;
  FirstName: string;
  LastName: string;
  Roles: string; // Comma-separated
}
