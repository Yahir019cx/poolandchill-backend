const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Simulamos el proceso de encriptación (debes usar tu servicio de encriptación real)
// Por ahora, usaremos datos de prueba que deberás encriptar con tu sistema

const testData = {
  nombre: "Prueba con Fotos",
  correo: "test@poolandchill.com",
  telefono: "+52 477 123 4567",
  rol: "anfitrión",
  tipoEspacio: ["Alberca", "Cabaña"],
  nombreLugar: "Cabañas Test con Fotos",
  direccion: "Av. Test #123, León, Gto.",
  descripcion: "Esta es una prueba del sistema de carga de archivos adjuntos.",
  mensaje: "Probando el envío de fotos adjuntas al formulario de contacto"
};

console.log('🧪 Test de envío de contacto con archivos adjuntos\n');
console.log('📋 Datos a enviar:', JSON.stringify(testData, null, 2));
console.log('\n⚠️  NOTA: Necesitas encriptar estos datos usando tu EncryptionService');
console.log('⚠️  Este script es solo una plantilla. Debes:');
console.log('   1. Encriptar los datos usando tu servicio de encriptación');
console.log('   2. Crear o usar imágenes de prueba');
console.log('   3. Configurar la URL correcta de tu servidor\n');

// Ejemplo de cómo enviar con archivos
const formData = new FormData();

// 1. Agregar los datos encriptados (DEBES ENCRIPTARLOS PRIMERO)
// formData.append('data', datosEncriptados);

// 2. Agregar fotos de prueba (si existen)
const testImagePaths = [
  // Agrega rutas a imágenes de prueba aquí
  // 'C:\\ruta\\a\\foto1.jpg',
  // 'C:\\ruta\\a\\foto2.png',
];

testImagePaths.forEach((imagePath, index) => {
  if (fs.existsSync(imagePath)) {
    formData.append('fotos', fs.createReadStream(imagePath), {
      filename: `foto-test-${index + 1}${path.extname(imagePath)}`,
      contentType: `image/${path.extname(imagePath).substring(1)}`
    });
    console.log(`✅ Foto ${index + 1} agregada: ${path.basename(imagePath)}`);
  } else {
    console.log(`❌ No se encontró: ${imagePath}`);
  }
});

console.log('\n📤 Ejemplo de código para el frontend:\n');
console.log(`
// En tu frontend (React, Vue, etc.)
const formData = new FormData();

// Encriptar los datos
const encryptedData = encryptionService.encrypt(contactData);
formData.append('data', encryptedData);

// Agregar las fotos seleccionadas por el usuario
fotosSeleccionadas.forEach(foto => {
  formData.append('fotos', foto);
});

// Enviar al servidor
const response = await fetch('http://localhost:3001/web/contact', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log('Respuesta:', result);
`);

console.log('\n📝 Validaciones implementadas:');
console.log('   ✓ Máximo 10 archivos');
console.log('   ✓ Máximo 5MB por archivo');
console.log('   ✓ Solo imágenes: JPG, JPEG, PNG, GIF');
console.log('   ✓ Datos encriptados con AES-GCM');

console.log('\n💡 Para probar manualmente puedes usar:');
console.log('   - Postman o Insomnia');
console.log('   - Swagger UI: http://localhost:3001/api');
console.log('   - Tu aplicación frontend');
