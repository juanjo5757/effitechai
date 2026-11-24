# MELOIA — proyecto completo

## Guardarlo en Windows

1. Descarga MELOIA.zip.
2. Extrae su contenido en E:\PROYECTOS. El ZIP ya contiene la carpeta MELOIA.
3. Verifica que exista E:\PROYECTOS\MELOIA\dist\index.html.

## Ver la página

Haz doble clic en ABRIR_MELOIA.bat o abre dist/index.html con tu navegador.
No necesitas instalar Node.js ni ejecutar npm install.

## Editarlo en Visual Studio Code

En Archivo > Abrir carpeta, selecciona E:\PROYECTOS\MELOIA.
Edita los archivos dentro de dist y recarga la página del navegador.

- dist/index.html: estructura, textos, secciones y metadatos.
- dist/styles.css: diseño, adaptación móvil y accesibilidad.
- dist/app.js: ejemplos, flujo animado, formulario e interacciones.
- dist/config.js: WhatsApp, email, calendario e integraciones opcionales.
- dist/favicon.svg: icono de la página.
- .openai/hosting.json: configuración del sitio publicado; no hace falta para abrirlo localmente.

## Qué funciona ahora

- WhatsApp: +57 317 686 7192.
- Email: meloia0412@gmail.com.
- Diagnóstico: se coordina por WhatsApp.
- Auditoría: prepara un mensaje que el visitante debe enviar desde su correo, Gmail o WhatsApp. No hay envío automático ni confirmación automática de recepción.
- Analítica preparada, desactivada hasta configurar sus identificadores y obtener consentimiento.
- Perfiles de Instagram y LinkedIn pendientes de sus enlaces reales.

## Próximos pasos

1. Revisa textos, planes y visualización en tu celular.
2. Crea un calendario para el diagnóstico gratuito y pega su enlace HTTPS en bookingUrl dentro de dist/config.js.
3. Para envío automático, conecta un backend o servicio de formularios en formEndpoint. Debe validar los campos, limitar spam, gestionar duplicados por requestId y devolver JSON {"ok":true} únicamente después de recibir/guardar/enviar correctamente la solicitud. No pongas claves privadas en estos archivos.
4. Actualiza la política de privacidad al incorporar proveedores o almacenamiento de solicitudes.
5. Publica las modificaciones cuando estén listas. Editar esta copia local no actualiza automáticamente el sitio publicado.

## Sitio publicado

https://meloia.foamy-raven-7353.chatgpt.site/

La versión publicada está configurada como privada para revisión. Antes de promocionarla hay que habilitar el acceso público y probar los canales de contacto.
