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
├── service/         # un servicio por recurso de la API; solo peticiones, retornan Observable
├── components/      # piezas reutilizables (navbar, paginador, alertas, modal, errores de campo)
└── pages/           # una carpeta por pantalla
```

- **Sesión:** `SesionStore` guarda el usuario con signals y el token en `localStorage`. Cerrar sesión en una pestaña la cierra en todas.
- **Interceptores:** `authInterceptor` agrega `Authorization: Bearer` solo a la API; `errorInterceptor` cierra la sesión ante un 401 y lleva a `/login?expirada=true`.
- **Guards:** `authGuard` exige sesión y recuerda la URL pedida (`returnUrl`); `invitadoGuard` saca del login a quien ya entró; `rolGuard` limita rutas por rol de acceso (la API aplica el mismo permiso).
- **Errores:** la API responde `ProblemDetail`; `problemaDe()` lo normaliza, `app-alerta-error` lo muestra y `aplicarErroresDelServidor()` pone los errores de validación (400) debajo de cada campo.
- **Formularios:** reactivos con `Validators`; los mensajes aparecen con `touched && invalid` (`app-campo-error`).

## Pantallas por historia de usuario

| Ruta | Pantalla | HU |
|---|---|---|
| `/login` | Inicio de sesión; vuelve a la ruta pedida | HU-03 |
| `/registro` | Registro de empresa; el representante entra como administrador | HU-01 |
| `/empresa` | Datos de la empresa y del usuario en sesión | HU-01, HU-03 |
| botón **Salir** | Cierre de sesión (`POST /auth/logout`) | HU-03 |
| `/procesos` | Lista paginada con búsqueda por nombre, filtros por estado y categoría, orden y "Ver eliminados" | HU-06, HU-07 |
| `/procesos/nuevo` | Crear proceso (nace en borrador con el pool de la empresa) | HU-04 |
| `/procesos/editar/:id` | Editar nombre, descripción, categoría y estado, con control de versión | HU-04, HU-05 |
| `/procesos/:id` | Ficha con publicar o volver a borrador, eliminar, historial de cambios y compartir por NIT | HU-04 a HU-07, HU-23 |
| `/compartidos` | Procesos que otras empresas compartieron, en solo lectura | HU-23 |
| `/usuarios` | Lista paginada con búsqueda y orden; el administrador cambia el rol y desactiva o reactiva | HU-02 |
| `/usuarios/nuevo` | Invitar usuario con contraseña inicial y rol (solo administrador) | HU-02 |

### Usuarios de prueba (datos demo del backend)

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@demo.com` | `admin123` | ADMINISTRADOR |
| `editor@demo.com` | `editor123` | EDITOR |
| `lector@demo.com` | `lector123` | LECTOR |
| `admin@andina.com` | `admin123` | ADMINISTRADOR (otra empresa) |
