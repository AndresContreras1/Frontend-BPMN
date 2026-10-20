# Frontend BPMN

SPA en Angular del visor y editor de procesos BPMN multiempresa. Consume la API REST de [Backend-BPMN](https://github.com/AndresContreras1/Backend-BPMN).

## Tecnologías

| Pieza | Versión |
|---|---|
| Angular (componentes standalone, signals) | 19.2 |
| TypeScript | 5.7 |
| Bootstrap (compilado desde Sass con el tema propio) + Bootstrap Icons | 5.3.8 / 1.13.1 |
| RxJS | 7.8 |
| Pruebas | Jasmine + Karma (Chrome headless) |
| Servidor de producción | nginx 1.27 |

## Requisitos

- Node.js 20 o superior y npm.
- El backend corriendo en `http://localhost:8090` (ver su README), o Docker para levantar todo junto (ver **Docker**).

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

Corre las pruebas unitarias una vez en Chrome headless y deja la cobertura en `coverage/` (197 pruebas; 88 % de líneas y 72 % de ramas).

### Pruebas de sistema (E2E)

Las pruebas con Selenium viven en el backend (`Backend-BPMN/src/test/java/.../e2e`), como se vio en clase: con este frontend corriendo (`npm start`), allá se lanzan con `./mvnw verify -Pe2e`. Buscan los elementos por `id` y, dentro de los `@for`, por clase (`fila-proceso`, `nombre-proceso`, `fila-compartido`, `fila-usuario`), así un cambio de estilos no las rompe.

## Integración continua y calidad

`.github/workflows/ci.yml` corre en cada pull request y en cada push a `main`: instala, ejecuta las pruebas con cobertura, compila en modo producción y construye la imagen Docker. El análisis de SonarCloud (`sonar-project.properties`, cobertura desde `coverage/frontend-bpmn/lcov.info`) se activa cuando el repositorio tiene el secreto `SONAR_TOKEN`.

## Despliegue en Kubernetes

`.github/workflows/deploy.yaml` publica la imagen en `ghcr.io/<dueño>/frontend-bpmn:latest` en cada push a `main` y, con el runner self-hosted `main` registrado (variable del repositorio `RUNNER_REGISTRADO=true`), aplica `k8s/deployment.yaml` y reinicia el Deployment.

| Objeto | Qué hace |
|---|---|
| `Deployment` `frontend-bpmn` | 2 réplicas de nginx con la SPA (`imagePullSecrets: ghcr-secret`) |
| `Service` `frontend-bpmn` | Puerto 80 dentro del clúster |
| `Ingress` | `ingressClassName: public`, host del grupo (`bpmn.inphotech.co`, cambiarlo por el asignado): `/` va al frontend; `/api`, `/swagger-ui` y `/v3/api-docs` los toma el Ingress del backend |

El namespace `bpmn`, el secret `ghcr-secret` y el Service `backend` (el nombre que usa `proxy_pass` en `nginx.conf`) se crean con el despliegue del backend.

## Docker

### Stack completo (PostgreSQL + backend + frontend)

Con los dos repositorios clonados uno al lado del otro:

```
Desktop/
├── Backend-BPMN/
└── Frontend-BPMN/   ← aquí está compose.yaml
```

```bash
cp .env.example .env
```

Cambie en `.env` la contraseña de la base de datos y, si quiere que los tokens sobrevivan a un reinicio, la clave JWT (`openssl rand -base64 64`). Luego:

```bash
docker compose up --build
```

| Servicio | Imagen | Acceso |
|---|---|---|
| `db` | `postgres:16` con volumen `pgdata` | solo red interna |
| `backend` | `Backend-BPMN/Dockerfile` (Maven → JRE 17), perfil `prod,demo` | solo red interna (`backend:8090`) |
| `frontend` | `Dockerfile` de este repositorio (Node 22 → nginx) | `http://localhost:8080` |

- El navegador solo habla con nginx: la SPA, la API (`/api/`) y Swagger (`/swagger-ui/index.html`) salen del mismo origen, sin CORS.
- El perfil `demo` carga las empresas, usuarios y procesos de demostración la primera vez (tabla de usuarios abajo).
- El backend crea el esquema de PostgreSQL con las migraciones de Flyway (`V1` y `V2`) y Hibernate lo valida al arrancar.
- `docker compose down` detiene todo; `docker compose down -v` borra también la base de datos.
- Si el volumen `pgdata` viene de una versión anterior (creado sin migraciones), el backend no arranca: bórrelo una vez con `docker compose down -v` o arranque una vez con `FLYWAY_BASELINE_ON_MIGRATE=true` en `.env` para conservarlo.
- nginx reenvía `Host` y `X-Forwarded-*`: Swagger publica `http://localhost:8080` como servidor y el límite de intentos del login se cuenta por la IP real del navegador.

### Solo el frontend

```bash
docker build -t frontend-bpmn .
```

La imagen compila la SPA con Node y la sirve con nginx en el puerto 80. nginx resuelve las rutas de Angular con `index.html` y reenvía `/api/` al servicio `backend:8090`.

### Verificación del stack completo

Con `docker compose up --build` y PostgreSQL vacío (perfil `prod,demo`):

- Flyway aplica `V1__esquema_inicial` y `V2__nombres_unicos_entre_activos` y el backend arranca con `ddl-auto=validate`.
- La colección de Postman del backend pasa completa **a través de nginx** (61 peticiones, 68 aserciones, 0 fallos):

  ```bash
  npx newman run ../Backend-BPMN/postman/BPMN-API.postman_collection.json -e ../Backend-BPMN/postman/local.postman_environment.json --env-var baseUrl=http://localhost:8080
  ```

- `GET /v3/api-docs` por nginx publica `http://localhost:8080` como servidor de Swagger.
- Más de 10 intentos de login seguidos desde el mismo navegador responden `429` con `Retry-After`.
- Recorrido de punta a punta en el navegador (`http://localhost:8080`): registrar una empresa nueva, crear sus roles de proceso, invitar un editor, crear un proceso, agregar lanes, modelar inicio, actividades y fin con las herramientas, conectar, validar, publicar, compartir por NIT con Facimus Demo y, entrando como `admin@demo.com`, verlo en **Compartidos conmigo** en solo lectura (la API responde 404 si la empresa invitada intenta editarlo).

## Estructura

```
src/app/
├── core/            # sesión, token, preferencias, avisos, carga; interceptores HTTP y guards
├── models/          # interfaces que reflejan los DTO de la API
├── service/         # un servicio por recurso de la API; solo peticiones, retornan Observable
├── components/      # piezas reutilizables (navbar, pie de página, indicador, avisos, paginador, alertas, modal…)
│   └── diagrama/    # lienzo SVG del diagrama y su geometría: lo usan el editor, la ficha y la página pública
└── pages/           # una carpeta por pantalla; lo que solo usa una pantalla va en su carpeta components/
```

- **Tema:** `styles.scss` define las variables de Bootstrap (`$primary`, radios, sombras, fondo) y después importa Bootstrap desde sus fuentes Sass, así todos los componentes toman los colores del proyecto. Las animaciones son CSS (`@keyframes`), y se apagan si el sistema pide menos movimiento.
- **Rutas:** cada página se carga al visitarla por primera vez (`loadComponent`) y tiene su `title`; el paquete inicial queda en unos 15 kB de `main`.
- **Diseño:** la página pública va de borde a borde, el editor usa todo el ancho y el resto va en un `container-xxl` que no crece sin límite en pantallas muy anchas. El menú colapsa por debajo de 1200 px (plugin Collapse) y el usuario tiene un menú desplegable (plugin Dropdown).
- **Avisos y carga:** `NotificacionesService` (signals) publica avisos breves que pinta `app-notificaciones` como toasts, aunque la página navegue justo después; `cargaInterceptor` cuenta las peticiones en curso y la barra superior se ve mientras quede alguna.
- **Preferencias:** `PreferenciasService` guarda en `localStorage` lo que no necesita el servidor (ver procesos como tabla o como tarjetas); si el navegador no lo permite, usa el valor por defecto.

- **Sesión:** `SesionStore` guarda el usuario con signals y el token en `localStorage`. Cerrar sesión en una pestaña la cierra en todas.
- **Interceptores:** `authInterceptor` agrega `Authorization: Bearer` solo a la API; `errorInterceptor` cierra la sesión ante un 401 y lleva a `/login?expirada=true`.
- **Guards:** `authGuard` exige sesión y recuerda la URL pedida (`returnUrl`); `invitadoGuard` saca del login a quien ya entró; `rolGuard` limita rutas por rol de acceso (la API aplica el mismo permiso).
- **Errores:** la API responde `ProblemDetail`; `problemaDe()` lo normaliza, `app-alerta-error` lo muestra y `aplicarErroresDelServidor()` pone los errores de validación (400) debajo de cada campo.
- **Formularios:** reactivos con `Validators`; el botón de enviar queda deshabilitado mientras el formulario no sea válido y los mensajes aparecen con `touched && invalid` (`app-campo-error`).
- **Parámetros de la URL:** se leen con `ActivatedRoute` en `ngOnInit` (`snapshot.queryParamMap` para `?returnUrl`, `?expirada`, `?eliminado`…; `paramMap` con `switchMap` para el `:id`).
- **Historias de usuario visibles:** cada pantalla muestra junto al título las HU que cubre, y cada panel del editor las del elemento abierto.

## Pantallas por historia de usuario

| Ruta | Pantalla | HU |
|---|---|---|
| `/` | Página pública: qué hace el sistema, el diagrama de vacaciones del enunciado dibujado con el mismo lienzo del editor, los seis frentes del proyecto, un carrusel con los elementos BPMN y cómo empezar. Con sesión iniciada lleva a `/inicio` | HU-01, HU-03 |
| `/inicio` | Inicio de la empresa: indicadores (activos, borradores, publicados, compartidos conmigo, eliminados), procesos modificados hace poco, avance de publicación y accesos según el rol | HU-07 |
| `/login` | Inicio de sesión; vuelve a la ruta pedida o al inicio | HU-03 |
| `/registro` | Registro de empresa; el representante entra como administrador | HU-01 |
| `/empresa` | Datos de la empresa y del usuario en sesión | HU-01, HU-03 |
| menú del usuario → **Cerrar sesión** | Cierre de sesión (`POST /auth/logout`) | HU-03 |
| `/procesos` | Lista paginada con búsqueda por nombre, filtros por estado y categoría, orden y "Ver eliminados"; como tabla o como tarjetas. Acepta `?estado=` y `?eliminados=true` (los enlaces del inicio) | HU-06, HU-07 |
| `/procesos/nuevo` | Crear proceso (nace en borrador con el pool de la empresa) | HU-04 |
| `/procesos/editar/:id` | Editar nombre, descripción, categoría y estado, con control de versión | HU-04, HU-05 |
| `/procesos/:id` | Ficha con el **diagrama completo en solo lectura**, publicar o volver a borrador, eliminar, historial de cambios y compartir por NIT | HU-04 a HU-07, HU-23 |
| `/procesos/:id/diagrama` | Editor del diagrama (ver abajo) | HU-08 a HU-16, HU-21, HU-22, HU-24 a HU-28 |
| `/compartidos` | Procesos que otras empresas compartieron, en solo lectura | HU-23 |
| `/roles` | Catálogo de roles de proceso: crear, editar, ver en qué procesos se usa y eliminar si no está en uso | HU-17 a HU-20 |
| `/usuarios` | Lista paginada con búsqueda y orden; el administrador cambia el rol y desactiva o reactiva | HU-02 |
| `/usuarios/nuevo` | Invitar usuario con contraseña inicial y rol (solo administrador) | HU-02 |

### Editor del diagrama

El lienzo es SVG y se dibuja con funciones puras (`pages/editor/layout.ts`). No hay arrastrar y soltar: la posición se elige con un clic.

- **Símbolos BPMN:** actividad con el ícono de su tipo, gateway exclusivo (X), paralelo (+) e inclusivo (O), inicio (círculo delgado), fin (círculo grueso), eventos de mensaje con sobre lleno (envía) o vacío (recibe).
- **Flujos:** secuencia con línea continua y punta sólida; mensajes con línea punteada, círculo de origen, punta hueca, nombre y clave de correlación.
- **Herramientas:** Inicio, Actividad, Gateway y Fin se colocan con un clic en la lane; Conectar une dos elementos del mismo pool; Enviar mensaje, Recibir mensaje y Notificación externa crean los flujos entre pools; Mover reubica el elemento elegido dentro de su pool.
- **Panel lateral:** formulario del elemento abierto (crear o editar), estructura de pools y lanes, y advertencias del validador (los errores impiden publicar; clic en una advertencia la ubica en el lienzo).
- **Gateway:** además de su tipo, el panel lista los arcos salientes y deja actualizar la condición de cada uno (HU-15); en un paralelo explica que los caminos no llevan condición.
- **Eliminar:** solo el administrador. Antes de confirmar se muestra el impacto: arcos que se van con el elemento y advertencias que quedarían.
- **Permisos:** el lector y las empresas invitadas ven el diagrama en solo lectura. En un proceso publicado la API rechaza los cambios que lo dejen incoherente y la página muestra los motivos.

### Usuarios de prueba (datos demo del backend)

| Correo | Contraseña | Rol |
|---|---|---|
| `admin@demo.com` | `admin123` | ADMINISTRADOR |
| `editor@demo.com` | `editor123` | EDITOR |
| `lector@demo.com` | `lector123` | LECTOR |
| `admin@andina.com` | `admin123` | ADMINISTRADOR (Comercial Andina, otra empresa) |
| `editor@andina.com` | `editor123` | EDITOR (Comercial Andina) |
| `lector@andina.com` | `lector123` | LECTOR (Comercial Andina) |

Facimus Demo comparte "Solicitud de vacaciones" con Comercial Andina: entrando con `admin@andina.com` se ve en **Compartidos conmigo**, en solo lectura.
