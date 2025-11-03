import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDecipheriv, pbkdf2Sync } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly SECRET_KEY: string;
  private readonly PBKDF2_ITERATIONS = 100000;
  private readonly KEY_LENGTH = 32; // 256 bits
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH = 12;

  constructor(private readonly configService: ConfigService) {
    // Obtener la clave de cifrado desde las variables de entorno
    const secretKey = this.configService.get<string>('ENCRYPTION_KEY');

    if (!secretKey) {
      throw new Error(
        'ENCRYPTION_KEY no está definida en las variables de entorno. ' +
        'Por favor, configura ENCRYPTION_KEY en tu archivo .env'
      );
    }

    this.SECRET_KEY = secretKey;
  }

  /**
   * Descifra datos encriptados con AES-GCM
   * @param encryptedBase64 String base64 que contiene: [16 bytes salt] + [12 bytes IV] + [datos cifrados + auth tag]
   * @returns Objeto JSON descifrado
   */
  decrypt<T = any>(encryptedBase64: string): T {
    try {
      // Decodificar el string base64
      const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');

      // Validar longitud mínima (salt + IV + al menos 1 byte de datos + 16 bytes de auth tag)
      const minLength = this.SALT_LENGTH + this.IV_LENGTH + 1 + 16;
      if (encryptedBuffer.length < minLength) {
        throw new BadRequestException('Datos cifrados inválidos: longitud insuficiente');
      }

      // Extraer el salt (primeros 16 bytes)
      const salt = encryptedBuffer.subarray(0, this.SALT_LENGTH);

      // Extraer el IV (siguientes 12 bytes)
      const iv = encryptedBuffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);

      // Extraer los datos cifrados y el auth tag (el resto)
      const encryptedData = encryptedBuffer.subarray(this.SALT_LENGTH + this.IV_LENGTH);

      const authTagLength = 16; // 128 bits - tamaño estándar de GCM

      // Extraer el auth tag (últimos 16 bytes)
      const ciphertext = encryptedData.subarray(0, encryptedData.length - authTagLength);
      const authTag = encryptedData.subarray(encryptedData.length - authTagLength);

      // Derivar la clave usando PBKDF2
      const key = pbkdf2Sync(
        this.SECRET_KEY,
        salt,
        this.PBKDF2_ITERATIONS,
        this.KEY_LENGTH,
        'sha256'
      );

      // Crear el decipher
      const decipher = createDecipheriv('aes-256-gcm', key, iv);

      // Establecer el auth tag
      decipher.setAuthTag(authTag);

      // Descifrar
      let decrypted = decipher.update(ciphertext, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      // Parsear el JSON
      return JSON.parse(decrypted) as T;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Capturar errores específicos de descifrado
      if (error.message?.includes('Unsupported state or unable to authenticate data')) {
        throw new BadRequestException('Error de autenticación: los datos han sido alterados o la clave es incorrecta');
      }

      throw new BadRequestException(`Error al descifrar los datos: ${error.message}`);
    }
  }

  /**
   * Valida que el string esté en formato base64 válido
   */
  isValidBase64(str: string): boolean {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }
}
