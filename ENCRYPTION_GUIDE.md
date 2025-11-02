# Guía de Implementación de Cifrado AES-GCM

## Resumen

El endpoint `/web/contact` ahora recibe datos cifrados usando AES-GCM (256 bits) para proteger la información sensible del formulario de contacto.

## Especificaciones Técnicas

### Algoritmo de Cifrado
- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Derivación de Clave**: PBKDF2 con 100,000 iteraciones y SHA-256
- **Longitud de Clave**: 256 bits (32 bytes)
- **Longitud de Salt**: 16 bytes
- **Longitud de IV**: 12 bytes
- **Longitud de Auth Tag**: 16 bytes

### Configuración de la Clave Secreta

La clave se configura mediante variables de entorno:

**Backend (.env)**:
```env
ENCRYPTION_KEY=P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d
```

**Frontend (.env)**:
```env
VITE_ENCRYPTION_KEY=P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d
```

⚠️ **IMPORTANTE**:
- Esta clave **DEBE** ser **IDÉNTICA** en frontend y backend
- No compartir esta clave en repositorios públicos
- Usar `.env.example` para documentar sin exponer el valor real
- El backend lanzará un error si `ENCRYPTION_KEY` no está definida

## Formato del Payload

### Request (Frontend → Backend)

```json
{
  "data": "string_cifrado_en_base64"
}
```

El string base64 contiene en orden:
1. **Salt** (16 bytes) - Usado para derivar la clave
2. **IV** (12 bytes) - Vector de inicialización
3. **Datos Cifrados** - El payload JSON cifrado
4. **Auth Tag** (16 bytes) - Tag de autenticación para verificar integridad

### Estructura del Payload Descifrado

```typescript
{
  nombre: string;          // Obligatorio
  correo: string;          // Obligatorio (formato email)
  telefono?: string;       // Opcional
  rol: "huésped" | "anfitrión";  // Obligatorio

  // Campos para huéspedes:
  mensaje?: string;

  // Campos para anfitriones:
  tipoEspacio?: string[];
  nombreLugar?: string;
  direccion?: string;
  descripcion?: string;
}
```

## Implementación en Backend

### Archivos Creados/Modificados

1. **`src/web/email/utils/encryption.service.ts`**
   - Servicio de descifrado AES-GCM
   - Usa `ConfigService` para obtener `ENCRYPTION_KEY` del entorno
   - Valida formato base64
   - Extrae salt, IV y datos cifrados
   - Deriva la clave usando PBKDF2
   - Descifra y parsea JSON

2. **`src/web/email/dto/encrypted-contact.dto.ts`**
   - DTO para el payload cifrado
   - Valida que `data` sea un string no vacío

3. **`src/web/email/contact/contact.controller.ts`**
   - Actualizado para recibir `EncryptedContactDto`
   - Valida formato base64
   - Descifra datos
   - Valida payload descifrado contra `ContactDto`
   - Envía correo si todo es válido

4. **`src/web/email/contact/contact.module.ts`**
   - Registra `EncryptionService` como provider

5. **`.env`**
   - Agregada variable `ENCRYPTION_KEY`

6. **`.env.example`**
   - Documentación de variables de entorno requeridas

## Flujo de Procesamiento

1. **Inicialización**: Al arrancar, `EncryptionService` valida que `ENCRYPTION_KEY` exista
2. **Recepción**: El endpoint recibe `{ data: "..." }`
3. **Validación Base64**: Verifica que `data` sea base64 válido
4. **Descifrado**:
   - Decodifica base64 a buffer
   - Extrae salt, IV, datos cifrados y auth tag
   - Deriva clave con PBKDF2 usando `ENCRYPTION_KEY`
   - Descifra con AES-256-GCM
5. **Parsing JSON**: Convierte string descifrado a objeto
6. **Validación**: Valida objeto contra `ContactDto` usando class-validator
7. **Procesamiento**: Envía email con los datos validados

## Manejo de Errores

### Errores Comunes

| Error | Causa | HTTP Status |
|-------|-------|-------------|
| `ENCRYPTION_KEY no está definida...` | Falta variable de entorno | Error fatal (app no inicia) |
| `El campo data debe ser un string base64 válido` | Formato base64 inválido | 400 |
| `Datos cifrados inválidos: longitud insuficiente` | Buffer muy corto | 400 |
| `Error de autenticación: los datos han sido alterados...` | Auth tag no coincide o clave incorrecta | 400 |
| `Datos descifrados inválidos: ...` | Payload no cumple validaciones de `ContactDto` | 400 |

## Configuración Inicial

### 1. Configurar Variables de Entorno

**Backend**:
```bash
# Copiar .env.example a .env
cp .env.example .env

# Editar .env y asegurar que ENCRYPTION_KEY esté configurada
# ENCRYPTION_KEY=P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d
```

**Frontend**:
```bash
# En tu proyecto frontend, configurar:
VITE_ENCRYPTION_KEY=P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d
```

### 2. Iniciar el Servidor

```bash
npm run start:dev
```

Si `ENCRYPTION_KEY` no está definida, la app lanzará un error:
```
Error: ENCRYPTION_KEY no está definida en las variables de entorno.
Por favor, configura ENCRYPTION_KEY en tu archivo .env
```

## Ejemplo de Prueba con cURL

```bash
# El frontend debe generar el payload cifrado
# Este es solo un ejemplo de estructura
curl -X POST http://localhost:3000/web/contact \
  -H "Content-Type: application/json" \
  -d '{"data":"BASE64_ENCRYPTED_STRING_HERE"}'
```

## Seguridad

✅ **Características de Seguridad:**
- Cifrado autenticado (GCM proporciona confidencialidad e integridad)
- Protección contra alteraciones (auth tag)
- Salt único por mensaje (previene ataques de diccionario)
- IV único por mensaje (previene reutilización de stream)
- PBKDF2 con 100k iteraciones (dificulta ataques de fuerza bruta)
- Validación de auth tag (detecta alteraciones)
- Validación de payload descifrado (previene inyección)
- Clave almacenada en variables de entorno (no hardcodeada)

⚠️ **Consideraciones:**
- **CRÍTICO**: La clave debe ser idéntica en frontend (VITE_ENCRYPTION_KEY) y backend (ENCRYPTION_KEY)
- Nunca comitear el archivo `.env` al repositorio
- Usar HTTPS en producción para proteger el canal de comunicación
- Implementar rate limiting para prevenir ataques de fuerza bruta
- Considerar rotación de claves periódica

## Compatibilidad con Frontend

El backend es compatible con la implementación del frontend que usa:
- Web Crypto API
- `crypto.subtle.importKey()` con PBKDF2
- `crypto.subtle.encrypt()` con AES-GCM
- Concatenación de salt + IV + datos cifrados en un solo buffer
- Codificación base64 del buffer completo

## Debugging

Para ver los valores durante el descifrado (solo en desarrollo):

```typescript
// En encryption.service.ts, dentro del método decrypt()
console.log('Salt:', salt.toString('hex'));
console.log('IV:', iv.toString('hex'));
console.log('Encrypted length:', ciphertext.length);
console.log('Auth tag:', authTag.toString('hex'));
console.log('Decrypted:', decrypted);
```

## Próximos Pasos Recomendados

1. ✅ **Clave en variables de entorno** - YA IMPLEMENTADO

2. **Agregar logging para auditoría**:
   ```typescript
   // Registrar intentos de descifrado fallidos
   // Monitorear patrones de ataque
   ```

3. **Implementar rate limiting**:
   ```typescript
   @UseGuards(ThrottlerGuard)
   @Throttle(10, 60) // 10 requests por minuto
   ```

4. **Añadir tests unitarios**:
   - Verificar descifrado correcto
   - Validar manejo de errores
   - Probar con datos malformados

## Troubleshooting

### Error: "ENCRYPTION_KEY no está definida"

**Solución**: Agregar la variable al archivo `.env`:
```env
ENCRYPTION_KEY=P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d
```

### Error: "Error de autenticación"

**Causas posibles**:
1. La clave en el backend es diferente a la del frontend
2. Los datos fueron alterados durante la transmisión
3. El formato del payload cifrado es incorrecto

**Solución**: Verificar que `ENCRYPTION_KEY` (backend) y `VITE_ENCRYPTION_KEY` (frontend) sean idénticos.

### Error: "Datos descifrados inválidos"

**Causa**: El payload descifrado no cumple con las validaciones de `ContactDto`

**Solución**: Verificar que el objeto enviado desde el frontend tenga todos los campos obligatorios:
- `nombre` (string)
- `correo` (email válido)
- `rol` ("huésped" o "anfitrión")
