# Webhook de Bold en Cloudflare Pages

## Requisito importante

El despliegue por carga directa de archivos no es suficiente para Pages Functions. Para publicar `functions/bold-webhook.js`, conecta el proyecto a GitHub mediante **Workers & Pages → Create application → Pages → Connect to Git** o despliega con Wrangler.

## Configuración recomendada

- Proyecto Cloudflare: `effitechai`
- Rama de producción: `main`
- Build command: `exit 0`
- Output directory: `/`
- Function: `/bold-webhook`

## Secreto

En Cloudflare: `Workers & Pages → effitechai → Settings → Variables and Secrets → Add → Encrypt`.

Crea el secreto:

```text
BOLD_WEBHOOK_SECRET
```

No lo agregues a GitHub, HTML, JavaScript público ni al chat.

## URL que se registrará en Bold

```text
https://effitechai.pages.dev/bold-webhook
```

En Bold: `Panel de Comercios → Integraciones → Webhooks → Configurar webhook`.

La función verifica `x-bold-signature` con HMAC-SHA256 y solo acepta solicitudes POST válidas. Después se puede conectar el evento aprobado con Gmail, HubSpot o una base de datos.

## Verificar sin cobros

El receptor de producción usa el secreto del comercio. En producción deja sin definir
`BOLD_WEBHOOK_MODE` y registra allí únicamente el webhook de producción.
Abrir la dirección con un navegador comprueba el rechazo de GET; una recepción se comprueba con POST.

Para ensayar la entrega de Bold, prepara en Pages una vista previa de la rama
`bold-test` del proyecto `effitechai`. Solo ese alias admite el modo de prueba.
Configura `BOLD_WEBHOOK_MODE=test` en el entorno Preview y vuelve a desplegar la vista previa.
Antes de registrar la URL, comprueba que el alias que Pages asignó es
`bold-test.effitechai.pages.dev`. En Bold usa el apartado de **webhooks de prueba**
y la dirección `https://bold-test.effitechai.pages.dev/bold-webhook`.
En el checkout del entorno de pruebas para integraciones en línea, la opción de probar
el webhook aparece al finalizar el recorrido de prueba. Comprueba el acuse
`{"ok":true,"environment":"test"}` y el mensaje de prueba en los registros de esa vista previa.

El manejador verifica la convención de firma de Bold para pruebas y termina al acusar
recibo. Los datos de prueba no pasan al procesamiento comercial. Una combinación
incompatible de host y modo devuelve 503. Una firma incorrecta devuelve 401.
Los despliegues de vista previa con otro alias compartirán las variables de Preview;
el receptor devolverá 503 en esos alias si se configuró el modo de prueba.

[Documentación de webhooks de Bold](https://developers.bold.co/webhook)

## Interpretar los avisos

Para ventas y anulaciones aprobadas o rechazadas, un acuse 200 con estado
`received` significa que la función autenticó y registró el aviso. El registro
contiene el ID del aviso, el ID del pago, el tipo y la referencia comercial cuando Bold
la envía. Una referencia nula es válida. Los reintentos conservan esos identificadores.
La función no factura ni entrega servicios al recibir una notificación.

Un JSON inválido da 400. Un aviso autenticado sin los identificadores necesarios da
422. Un tipo nuevo con identificador y nombre recibe 200 con estado `ignored`;
así se puede reconocer el descarte sin provocar reintentos innecesarios.
