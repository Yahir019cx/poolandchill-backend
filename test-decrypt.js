// Script de prueba para verificar el descifrado
// Ejecutar con: node test-decrypt.js

const crypto = require('crypto');

const SECRET_KEY = 'P00l4ndCh1ll-Sup3rS3cur3K3y-2025-AES256-GCM-Pr0t3ct33d';
const PBKDF2_ITERATIONS = 100000;

// Función para probar descifrado con diferentes formatos
function testDecrypt(encryptedBase64) {
  try {
    console.log('\n🔐 ===== INICIANDO PRUEBA DE DESCIFRADO =====\n');
    console.log('📏 Longitud del string base64:', encryptedBase64.length);

    const encryptedBuffer = Buffer.from(encryptedBase64, 'base64');
    console.log('📦 Longitud del buffer decodificado:', encryptedBuffer.length, 'bytes');
    console.log('📊 Contenido (primeros 100 bytes en hex):', encryptedBuffer.subarray(0, 100).toString('hex'));

    // Extraer salt (primeros 16 bytes)
    const salt = encryptedBuffer.subarray(0, 16);
    console.log('\n🧂 Salt (16 bytes):');
    console.log('   Hex:', salt.toString('hex'));

    // Extraer IV (siguientes 12 bytes)
    const iv = encryptedBuffer.subarray(16, 28);
    console.log('\n🎲 IV (12 bytes):');
    console.log('   Hex:', iv.toString('hex'));

    // El resto es: datos cifrados + auth tag
    const encryptedDataWithTag = encryptedBuffer.subarray(28);
    console.log('\n📊 Datos cifrados + Auth Tag:', encryptedDataWithTag.length, 'bytes');

    // Derivar clave
    console.log('\n⏳ Derivando clave con PBKDF2 (esto puede tardar un momento)...');
    const key = crypto.pbkdf2Sync(SECRET_KEY, salt, PBKDF2_ITERATIONS, 32, 'sha256');
    console.log('✅ Clave derivada (primeros 16 bytes en hex):', key.subarray(0, 16).toString('hex'));

    // OPCIÓN 1: Auth tag al final (últimos 16 bytes)
    console.log('\n--- INTENTANDO: Auth Tag al FINAL ---');
    try {
      const ciphertext1 = encryptedDataWithTag.subarray(0, encryptedDataWithTag.length - 16);
      const authTag1 = encryptedDataWithTag.subarray(encryptedDataWithTag.length - 16);

      console.log('📝 Texto cifrado:', ciphertext1.length, 'bytes');
      console.log('🏷️  Auth Tag:', authTag1.toString('hex'));

      const decipher1 = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher1.setAuthTag(authTag1);

      let decrypted1 = decipher1.update(ciphertext1, null, 'utf8');
      decrypted1 += decipher1.final('utf8');

      console.log('✅ ¡ÉXITO! Descifrado con auth tag al final:');
      console.log('📄 Resultado:', decrypted1);

      try {
        const json = JSON.parse(decrypted1);
        console.log('📋 JSON parseado correctamente:', json);
      } catch (e) {
        console.log('⚠️  No es JSON válido');
      }

      return;
    } catch (e) {
      console.log('❌ Falló con auth tag al final:', e.message);
    }

    // OPCIÓN 2: Auth tag al principio (primeros 16 bytes)
    console.log('\n--- INTENTANDO: Auth Tag al PRINCIPIO ---');
    try {
      const authTag2 = encryptedDataWithTag.subarray(0, 16);
      const ciphertext2 = encryptedDataWithTag.subarray(16);

      console.log('🏷️  Auth Tag:', authTag2.toString('hex'));
      console.log('📝 Texto cifrado:', ciphertext2.length, 'bytes');

      const decipher2 = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher2.setAuthTag(authTag2);

      let decrypted2 = decipher2.update(ciphertext2, null, 'utf8');
      decrypted2 += decipher2.final('utf8');

      console.log('✅ ¡ÉXITO! Descifrado con auth tag al principio:');
      console.log('📄 Resultado:', decrypted2);

      try {
        const json = JSON.parse(decrypted2);
        console.log('📋 JSON parseado correctamente:', json);
      } catch (e) {
        console.log('⚠️  No es JSON válido');
      }

      return;
    } catch (e) {
      console.log('❌ Falló con auth tag al principio:', e.message);
    }

    console.log('\n❌ No se pudo descifrar con ninguna opción');

  } catch (error) {
    console.error('\n💥 Error general:', error.message);
    console.error(error);
  }
}

// Instrucciones de uso
console.log(`
╔════════════════════════════════════════════════════════════════╗
║  SCRIPT DE PRUEBA DE DESCIFRADO AES-GCM                        ║
╚════════════════════════════════════════════════════════════════╝

INSTRUCCIONES:
1. Copia el string base64 cifrado que el frontend está enviando
2. Reemplaza 'TU_STRING_BASE64_AQUI' en la línea de abajo
3. Ejecuta: node test-decrypt.js

`);

// Pega aquí el string base64 que el frontend está enviando
const encryptedData = 'TU_STRING_BASE64_AQUI';

if (encryptedData === 'TU_STRING_BASE64_AQUI') {
  console.log('⚠️  Por favor, reemplaza TU_STRING_BASE64_AQUI con el string cifrado real del frontend');
  console.log('\nEjemplo de uso:');
  console.log('const encryptedData = "abc123...tu_string_base64...xyz";');
  console.log('\nLuego ejecuta: node test-decrypt.js\n');
} else {
  testDecrypt(encryptedData);
}
