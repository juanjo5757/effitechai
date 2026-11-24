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
