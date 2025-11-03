# Configuración del Frontend para Cifrado

## Estado Actual

✅ **El backend está funcionando correctamente** y puede descifrar datos del frontend.

⚠️ **El frontend está usando la clave fallback** (`poolandchill-secret-key-2025`) en lugar de la clave de producción.

## Solución: Configurar la Variable de Entorno

### Paso 1: Crear/Actualizar el archivo `.env` en el proyecto frontend

En la raíz de tu proyecto frontend (donde está `package.json`), crea o edita el archivo `.env`:

```env
VITE_ENCRYPTION_KEY=P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d
```

**IMPORTANTE:**
- El nombre de la variable **DEBE** ser `VITE_ENCRYPTION_KEY` (con el prefijo `VITE_`)
- El valor debe ser **exactamente** el mismo que en el backend
- No debe haber espacios alrededor del `=`

### Paso 2: Reiniciar el servidor de desarrollo

Después de crear/modificar el `.env`, **DEBES reiniciar el servidor de desarrollo**:

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar:
npm run dev
# o
yarn dev
```

### Paso 3: Verificar que funciona

1. Abre la consola del navegador (F12)
2. Envía el formulario de contacto
3. Verifica en los logs del backend

**Si está configurado correctamente:**
- ✅ El backend NO mostrará la advertencia sobre la clave fallback
- ✅ El correo se enviará exitosamente

**Si sigue usando el fallback:**
- ⚠️ Verás este warning en los logs del backend:
  ```
  ⚠️  [ADVERTENCIA] El frontend está usando la clave fallback.
  Por favor, configura VITE_ENCRYPTION_KEY en el .env del frontend.
  ```

## Verificación en el Código del Frontend

Tu archivo `encryption.utils.js` (o similar) tiene esta línea:

```javascript
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'poolandchill-secret-key-2025';
```

Cuando la variable de entorno está configurada correctamente, `import.meta.env.VITE_ENCRYPTION_KEY` tendrá el valor correcto y NO usará el fallback.

## Para Debugging

Si quieres verificar que la variable se está cargando, puedes agregar temporalmente en tu código del frontend:

```javascript
console.log('Encryption key loaded:', import.meta.env.VITE_ENCRYPTION_KEY ? 'YES' : 'NO (using fallback)');
```

**NUNCA imprimas la clave completa en producción.**

## Archivo `.env.example` (Opcional pero Recomendado)

Crea un archivo `.env.example` en tu proyecto frontend con:

```env
# Clave de cifrado para el formulario de contacto
# DEBE coincidir con ENCRYPTION_KEY del backend
VITE_ENCRYPTION_KEY=your_encryption_key_here
```

Este archivo SÍ se puede commitear al repositorio como documentación.

## Seguridad

✅ **Qué hacer:**
- Agregar `.env` al `.gitignore`
- Usar `.env.example` para documentar las variables requeridas
- Mantener `.env` solo en tu máquina local y en el servidor de producción

❌ **Qué NO hacer:**
- NO commitear el archivo `.env` al repositorio
- NO compartir la clave en chats o documentos públicos
- NO imprimir la clave completa en logs de producción

## Configuración en Producción

Cuando despliegues a producción (Vercel, Netlify, etc.), deberás configurar la variable de entorno en el panel de control de tu plataforma:

### Vercel
1. Ve a Project Settings → Environment Variables
2. Agrega: `VITE_ENCRYPTION_KEY` = `P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d`
3. Redeploy el proyecto

### Netlify
1. Ve a Site settings → Environment variables
2. Agrega: `VITE_ENCRYPTION_KEY` = `P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d`
3. Trigger deploy

## Resultado Esperado

Una vez configurado correctamente:

1. El frontend cifrará con la clave de producción
2. El backend descifrará exitosamente
3. NO verás warnings en los logs
4. Los emails se enviarán correctamente

## Troubleshooting

### Problema: "Error de autenticación"

**Causa:** Las claves no coinciden

**Solución:**
1. Verifica que `VITE_ENCRYPTION_KEY` en el frontend sea exactamente igual a `ENCRYPTION_KEY` en el backend
2. Reinicia ambos servidores (frontend y backend)
3. Limpia la caché del navegador

### Problema: Sigue usando el fallback

**Causa:** La variable de entorno no se cargó

**Solución:**
1. Verifica que el archivo se llame `.env` (no `.env.local` ni `.env.development`)
2. Verifica que la variable empiece con `VITE_`
3. Reinicia el servidor de desarrollo del frontend
4. Si usas Vite, verifica que estés accediendo con `import.meta.env.VITE_*`

### Problema: "import.meta.env.VITE_ENCRYPTION_KEY is undefined"

**Causa:** Vite no está reconociendo la variable

**Solución:**
1. El nombre DEBE empezar con `VITE_`
2. El archivo DEBE estar en la raíz del proyecto
3. DEBES reiniciar el servidor después de crear/modificar `.env`
