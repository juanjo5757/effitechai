# EffiTech AI

## Abrir y editar

En Windows, abre la carpeta `E:\PROYECTOS\EffiTech AI` o tu clon del repositorio. Abre el `index.html` de la raíz en un navegador. `ABRIR_EFFITECH_AI.bat` abre ese mismo archivo. El lanzador con el nombre antiguo se conserva como acceso compatible.

Para probar rutas como la página 404 o los enlaces desde un móvil en tu red, sirve la raíz mediante un servidor HTTP local. El navegador puede abrir los archivos estáticos directamente. La función de Bold necesita un entorno de Pages Functions.

## Archivos de trabajo

- `index.html`, `styles.css` y `theme-overrides.css` contienen las secciones y su diseño.
- `app.js` controla formularios, idioma, precios y demostraciones. `idiomas.js` contiene la versión inglesa de los textos. Las páginas de políticas y de error comparten el selector de idioma de `documento.js`.
- `config.js` contiene los importes orientativos, canales de contacto y agenda pública del diagnóstico. Los campos opcionales de correo automático, redes y medición se activan al configurar los servicios.
- `privacidad.html`, `terminos.html`, `reembolsos.html` y `cookies.html` incluyen la información en español e inglés.
- `functions/bold-webhook.js` recibe avisos de Bold. Consulta [la guía de Bold](WEBHOOK_BOLD_CLOUDFLARE.md) antes de probar un entorno.

## Publicar

Cloudflare Pages toma la raíz de la rama `main` del repositorio de EffiTech AI. Los cambios locales llegan al sitio al incorporarlos a esa rama y completarse el despliegue. La carpeta `dist` de algunas copias antiguas corresponde a una distribución anterior. La fuente de edición y despliegue de Pages es la raíz, que incluye `functions/`.

El sitio usa [effitechai.pages.dev](https://effitechai.pages.dev/). Si cambia el dominio, actualiza los metadatos de `index.html`, `robots.txt` y `sitemap.xml` juntos.
