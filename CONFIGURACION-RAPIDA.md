# 🚀 Configuración Rápida - Pool and Chill Backend

## ⚠️ Error Actual

Si estás viendo este error:
```
Error: Microsoft Graph credentials not configured
```

Es porque faltan las variables de entorno necesarias para Microsoft Graph API.

---

## 📋 Pasos para Configurar

### 1. Crear archivo `.env`

Copia el archivo de ejemplo:
```bash
cp .env.example .env
```

O en Windows:
```cmd
copy .env.example .env
```

### 2. Obtener Credenciales de Microsoft Graph

#### Opción A: Si ya tienes una app registrada en Azure

1. Ve a [Azure Portal](https://portal.azure.com)
2. Navega a **Azure Active Directory** > **App registrations**
3. Selecciona tu aplicación (o crea una nueva)
4. Anota estos valores:
   - **Application (client) ID** → `GRAPH_CLIENT_ID`
   - **Directory (tenant) ID** → `GRAPH_TENANT_ID`
5. Ve a **Certificates & secrets**
6. Crea un nuevo **Client secret**
7. Copia el valor → `GRAPH_CLIENT_SECRET`
8. Ve a **API permissions** y asegúrate de tener:
   - `Mail.Send` (Application permission)
   - `User.Read` (Delegated permission)

#### Opción B: Crear nueva aplicación en Azure

1. Ve a [Azure Portal](https://portal.azure.com)
2. **Azure Active Directory** > **App registrations** > **New registration**
3. Nombre: "PoolAndChill Backend"
4. Supported account types: "Accounts in this organizational directory only"
5. Click **Register**
6. Sigue los pasos de la Opción A

### 3. Configurar el archivo `.env`

Edita el archivo `.env` y reemplaza los valores:

```env
# Microsoft Graph API
GRAPH_TENANT_ID=12345678-1234-1234-1234-123456789012
GRAPH_CLIENT_ID=87654321-4321-4321-4321-210987654321
GRAPH_CLIENT_SECRET=tu~secret~aqui~muy~largo
GRAPH_SENDER=contacto@poolandchill.com.mx

# Encryption
ENCRYPTION_KEY=una-clave-de-32-caracteres-1234

# App
PORT=3001
NODE_ENV=development
```

### 4. Generar una clave de encriptación

La `ENCRYPTION_KEY` debe tener exactamente 32 caracteres. Puedes generar una así:

**En Node.js:**
```javascript
require('crypto').randomBytes(32).toString('hex').substring(0, 32)
```

**En PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | % {[char]$_})
```

**En Linux/Mac:**
```bash
openssl rand -hex 16
```

### 5. Reiniciar el servidor

```bash
npm run start:dev
```

---

## 🧪 Verificar que Funciona

Una vez configurado, el servidor debería iniciar sin errores. Verifica:

```bash
# 1. El servidor inicia correctamente
npm run start:dev

# 2. Verifica que el endpoint existe
curl http://localhost:3001/web/contact

# 3. O abre Swagger UI
# http://localhost:3001/api
```

---

## ❌ Errores Comunes

### Error: "tenantId is a required parameter"
**Solución**: Verifica que `GRAPH_TENANT_ID` esté configurado en el `.env`

### Error: "Application with identifier was not found"
**Solución**: Verifica que `GRAPH_CLIENT_ID` sea correcto

### Error: "Invalid client secret"
**Solución**: El `GRAPH_CLIENT_SECRET` expiró o es incorrecto. Genera uno nuevo en Azure Portal

### Error: "Insufficient privileges to complete the operation"
**Solución**: La app necesita permisos `Mail.Send` en Azure Portal
1. Ve a tu app en Azure Portal
2. **API permissions** > **Add a permission**
3. **Microsoft Graph** > **Application permissions**
4. Busca y selecciona `Mail.Send`
5. Click **Grant admin consent**

### El servidor inicia pero no envía correos
**Solución**: Verifica que `GRAPH_SENDER` sea una cuenta válida de Microsoft 365

---

## 📁 Estructura de Archivos

```
poolandchill-backend/
├── .env                          # TUS credenciales (NO subir a git)
├── .env.example                  # Plantilla (sí subir a git)
├── src/
│   └── web/
│       └── email/
│           ├── contact/
│           │   ├── contact.controller.ts  # Endpoint con soporte de archivos
│           │   └── contact.service.ts     # Lógica de negocio
│           └── graph-mail.service.ts      # Cliente de Microsoft Graph
└── INSTRUCCIONES-FOTOS-ADJUNTAS.md  # Guía de implementación frontend
```

---

## 🔐 Seguridad

⚠️ **NUNCA subas el archivo `.env` al repositorio**

El `.gitignore` ya está configurado para ignorar `.env`, pero verifica:

```bash
git status  # .env NO debe aparecer aquí
```

Si accidentalmente lo subiste:
```bash
git rm --cached .env
git commit -m "Remove .env from repository"
```

---

## 🆘 ¿Necesitas Ayuda?

1. Revisa los logs del servidor para errores específicos
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de tener permisos de administrador en Azure AD
4. Consulta la documentación de Microsoft Graph: https://learn.microsoft.com/en-us/graph/

---

## ✅ Checklist de Configuración

- [ ] Archivo `.env` creado
- [ ] Variables de Microsoft Graph configuradas
- [ ] Clave de encriptación generada (32 caracteres)
- [ ] Permisos `Mail.Send` otorgados en Azure Portal
- [ ] Servidor inicia sin errores
- [ ] Endpoint `/web/contact` responde

---

¡Una vez completada la configuración, ya puedes probar el envío de correos con archivos adjuntos! 🎉
