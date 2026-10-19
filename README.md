# Frontend BPMN

SPA en Angular del visor y editor de procesos BPMN multiempresa. Consume la API REST de [Backend-BPMN](https://github.com/AndresContreras1/Backend-BPMN).

## Tecnologías

| Pieza | Versión |
|---|---|
| Angular (componentes standalone, signals) | 19.2 |
| TypeScript | 5.7 |
| Bootstrap + Bootstrap Icons | 5.3.8 / 1.13.1 |
| RxJS | 7.8 |
| Pruebas | Jasmine + Karma (Chrome headless) |
| Servidor de producción | nginx 1.27 |

## Requisitos

- Node.js 20 o superior y npm.
- El backend corriendo en `http://localhost:8090` (ver su README).

## Ejecutar en desarrollo

```bash
npm install
npm start
```

La app queda en `http://localhost:4200`. Las peticiones a `/api` se reenvían al backend con `proxy.conf.json`, así el navegador ve un solo origen y no hace falta CORS.

## Pruebas

```bash
npm run test:ci
```

Corre las pruebas unitarias una vez en Chrome headless y deja la cobertura en `coverage/`.

## Docker

```bash
docker build -t frontend-bpmn .
```

La imagen compila la SPA con Node y la sirve con nginx en el puerto 80. nginx resuelve las rutas de Angular con `index.html` y reenvía `/api/` al servicio `backend:8090`.

## Estructura

```
src/app/
├── core/            # sesión, token, interceptores HTTP y guards
├── models/          # interfaces que reflejan los DTO de la API
├── components/      # piezas reutilizables (navbar, paginador, alertas, modal)
└── pages/           # una carpeta por pantalla
```

- **Sesión:** `SesionStore` guarda el usuario con signals y el token en `localStorage`.
- **Interceptores:** `authInterceptor` agrega `Authorization: Bearer` solo a la API; `errorInterceptor` cierra la sesión ante un 401.
- **Errores:** la API responde `ProblemDetail`; `problemaDe()` lo normaliza y `app-alerta-error` lo muestra con los errores por campo.
