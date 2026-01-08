# 📸 Carga de Fotos en Formulario de Contacto

## Resumen de la Implementación

Se implementó el soporte para **subir hasta 10 fotos** (máximo 5MB cada una) en el formulario de contacto, enviándolas como **archivos individuales** (no ZIP) para mejor flexibilidad y compatibilidad con Microsoft Graph API.

---

## ✅ Validaciones Implementadas

- **Cantidad**: Máximo 10 archivos por solicitud
- **Tamaño**: Máximo 5MB por archivo
- **Formatos**: JPG, JPEG, PNG, GIF
- **Encriptación**: Los datos del formulario siguen encriptados con AES-GCM

---

## 🔧 Cambios Realizados

### 1. Backend (NestJS)

#### Archivos modificados:
- `src/web/email/dto/contact.dto.ts` - Agregado campo `fotos`
- `src/web/email/contact/contact.controller.ts` - Manejo de archivos con Multer
- `src/web/email/graph-mail.service.ts` - Soporte para adjuntos
- `src/web/email/contact/contact.service.ts` - Procesamiento y template email

#### Dependencias instaladas:
```bash
npm install @nestjs/platform-express
npm install --save-dev @types/multer
```

---

## 📤 Cómo Enviar desde el Frontend

### Opción 1: JavaScript Vanilla / React / Vue

```javascript
// 1. Preparar los datos del formulario
const contactData = {
  nombre: "Juan Pérez",
  correo: "juan@example.com",
  telefono: "+52 477 123 4567",
  rol: "anfitrión",
  tipoEspacio: ["Alberca", "Cabaña"],
  nombreLugar: "Cabañas del Sol",
  direccion: "Av. Juárez #123, León, Gto.",
  descripcion: "Hermosa cabaña con alberca",
  mensaje: "Me gustaría registrar mi propiedad"
};

// 2. Encriptar los datos (usa tu servicio de encriptación)
const encryptedData = encryptionService.encrypt(contactData);

// 3. Crear FormData
const formData = new FormData();
formData.append('data', encryptedData);

// 4. Agregar las fotos (del input file o selección del usuario)
const fotosInput = document.getElementById('fotos'); // <input type="file" multiple>
Array.from(fotosInput.files).forEach(foto => {
  formData.append('fotos', foto);
});

// 5. Enviar al servidor
const response = await fetch('https://tu-servidor.com/web/contact', {
  method: 'POST',
  body: formData
  // NO incluyas Content-Type header, el browser lo configura automáticamente
});

const result = await response.json();
console.log('Respuesta:', result);
```

### Opción 2: React con Estado

```jsx
import { useState } from 'react';

function ContactForm() {
  const [fotos, setFotos] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    // Validar en el cliente antes de enviar
    if (files.length > 10) {
      alert('Máximo 10 fotos permitidas');
      return;
    }

    const invalidFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      alert('Algunos archivos exceden el límite de 5MB');
      return;
    }

    setFotos(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();

    // Encriptar datos del formulario
    const contactData = { /* ... tus datos ... */ };
    const encryptedData = encryptionService.encrypt(contactData);
    formData.append('data', encryptedData);

    // Agregar fotos
    fotos.forEach(foto => {
      formData.append('fotos', foto);
    });

    try {
      const response = await fetch('/web/contact', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      console.log('Éxito:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Otros campos del formulario */}

      <input
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif"
        onChange={handleFileChange}
        max="10"
      />

      <p>Fotos seleccionadas: {fotos.length}/10</p>

      <button type="submit">Enviar</button>
    </form>
  );
}
```

### Opción 3: Axios

```javascript
import axios from 'axios';

const formData = new FormData();

// Encriptar datos
const encryptedData = encryptionService.encrypt(contactData);
formData.append('data', encryptedData);

// Agregar fotos
fotosSeleccionadas.forEach(foto => {
  formData.append('fotos', foto);
});

// Enviar
const response = await axios.post('/web/contact', formData, {
  headers: {
    'Content-Type': 'multipart/form-data'
  },
  onUploadProgress: (progressEvent) => {
    const percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    console.log(`Progreso: ${percentCompleted}%`);
  }
});

console.log('Respuesta:', response.data);
```

---

## 🧪 Cómo Probar

### 1. Con Postman

1. Crear nueva request POST a `http://localhost:3001/web/contact`
2. En la pestaña "Body", seleccionar "form-data"
3. Agregar campo `data` con tus datos encriptados (tipo Text)
4. Agregar campo `fotos` (cambiar tipo a File) y seleccionar imágenes
5. Puedes agregar múltiples campos `fotos` para enviar varias imágenes
6. Click en "Send"

### 2. Con Swagger UI

1. Ir a `http://localhost:3001/api`
2. Buscar endpoint POST `/web/contact`
3. Click en "Try it out"
4. Llenar el campo `data` con datos encriptados
5. Subir archivos en el campo `fotos`
6. Click en "Execute"

### 3. Con tu Frontend

Sigue los ejemplos de código de arriba según tu framework.

---

## 📧 Resultado del Email

Cuando se envían fotos, el email incluye:

1. **Adjuntos**: Cada foto se adjunta individualmente al email
2. **Sección visual**: Se muestra en el cuerpo del email:
   - Cantidad de fotos adjuntas
   - Nombres de los archivos

Ejemplo:
```
┌─────────────────────────────────┐
│ Fotos del Lugar                 │
├─────────────────────────────────┤
│ 📎 3 fotos adjuntas             │
│ foto-1.jpg, foto-2.png, ...     │
└─────────────────────────────────┘
```

---

## ⚠️ Errores Comunes

### Error: "Solo se permiten archivos de imagen"
**Causa**: Intentas subir un archivo que no es JPG, JPEG, PNG o GIF
**Solución**: Verifica el tipo de archivo antes de enviar

### Error: Archivo muy grande
**Causa**: Uno o más archivos exceden 5MB
**Solución**: Comprime las imágenes antes de enviar o reduce la calidad

### Error: "Datos descifrados inválidos"
**Causa**: Los datos no están correctamente encriptados
**Solución**: Verifica que uses el servicio de encriptación correcto

### No se envían las fotos
**Causa**: El nombre del campo no coincide
**Solución**: Asegúrate de usar `formData.append('fotos', archivo)` (plural)

---

## 🔒 Seguridad

- ✅ Validación de tipos de archivo (solo imágenes)
- ✅ Límite de tamaño por archivo (5MB)
- ✅ Límite de cantidad de archivos (10)
- ✅ Datos del formulario encriptados con AES-GCM
- ✅ Los archivos se procesan en memoria (no se guardan en disco)
- ✅ Los archivos se convierten a base64 para envío seguro por email

---

## 📝 Notas Importantes

1. **NO comprimas en ZIP**: Los archivos se envían individualmente, no necesitas crear un ZIP en el frontend
2. **Content-Type automático**: No configures manualmente el Content-Type cuando uses FormData, el navegador lo hace automáticamente
3. **Nombres de archivos**: Se preservan los nombres originales de los archivos
4. **Opcional**: Las fotos son opcionales, el formulario funciona sin ellas
5. **Orden**: No importa el orden en que agregues los campos al FormData

---

## 🚀 Próximos Pasos

- [ ] Implementar el frontend según los ejemplos de código
- [ ] Probar con diferentes formatos de imagen
- [ ] Probar con diferentes cantidades de archivos (1, 5, 10)
- [ ] Implementar preview de imágenes antes de enviar
- [ ] Agregar indicador de progreso de carga
- [ ] Validar tamaños en el cliente antes de enviar

---

## 💡 Tips de UX

```jsx
// Mostrar preview de las fotos seleccionadas
const [previews, setPreviews] = useState([]);

const handleFileChange = (e) => {
  const files = Array.from(e.target.files);

  // Crear URLs de preview
  const newPreviews = files.map(file => ({
    url: URL.createObjectURL(file),
    name: file.name,
    size: (file.size / 1024).toFixed(2) + ' KB'
  }));

  setPreviews(newPreviews);
  setFotos(files);
};

// Limpiar URLs cuando el componente se desmonte
useEffect(() => {
  return () => {
    previews.forEach(p => URL.revokeObjectURL(p.url));
  };
}, [previews]);
```

---

¿Preguntas? Revisa el código en:
- Controller: `src/web/email/contact/contact.controller.ts`
- Service: `src/web/email/contact/contact.service.ts`
- DTO: `src/web/email/dto/contact.dto.ts`
