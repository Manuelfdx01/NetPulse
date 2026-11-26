# Evidencia de depuración — Prototipo 2

Este documento es una plantilla para registrar la depuración real. Debe completarse durante la ejecución local; no se deben inventar valores observados ni afirmar que un breakpoint se alcanzó sin haberlo ejecutado.

## Flujos obligatorios

1. **Login exitoso:** formulario OWL → cliente HTTP → controlador de login → validación de contraseña → emisión del JWT → siguiente petición con `Authorization: Bearer`.
2. **Crear incidencia:** formulario OWL → cliente HTTP → controlador → caso de uso `IncidentApplicationService` → repositorio Odoo → ORM.
3. **Acceso rechazado:** petición con token de un técnico a una incidencia ajena → validación de acceso/record rule → respuesta 403 → mensaje de permiso insuficiente en OWL.

## Inventario de breakpoints

Registrar al menos diez puntos entre cliente y backend. Incluir un breakpoint condicional y un logpoint.

| N.º | Flujo | Capa | Archivo y línea real | Tipo (normal/condicional/logpoint) | Valor esperado | Valor observado |
|---:|---|---|---|---|---|---|
| 1 | Login | OWL | `static/src/js/netpulse_client.js` — método `login` | Normal | Login enviado una vez | Por completar |
| 2 | Login | Cliente HTTP | `static/src/js/api_client.js` — método `login` | Normal | POST a `/auth/login` | Por completar |
| 3 | Login | Cliente HTTP | `static/src/js/api_client.js` — método `request` | Condicional: respuesta 401 o 200 | Código HTTP esperado | Por completar |
| 4 | Login | Backend | `controllers/api.py` — método `login` | Normal | Login y usuario localizado | Por completar |
| 5 | Login | Backend | `services/jwt_service.py` — método `issue_token` | Normal | `sub`, `iat`, `exp` coherentes | Por completar |
| 6 | Crear | OWL | `static/src/js/netpulse_client.js` — método `createIncident` | Logpoint | ID de dispositivo enviado | Por completar |
| 7 | Crear | Backend | `controllers/api.py` — método `create_incident` | Normal | Payload validado | Por completar |
| 8 | Crear | Aplicación | `application/incident_service.py` — método `create_incident` | Normal | Rol y valores seguros | Por completar |
| 9 | Crear | Persistencia | `services/odoo_incident_repository.py` — método `create` | Normal | Registro persistido | Por completar |
| 10 | 403 | Backend | `services/odoo_incident_repository.py` — método `get` | Normal | Regla de acceso rechaza el registro ajeno | Por completar |

> Las líneas pueden cambiar entre commits. Antes de entregar, sustituir cada referencia por el número de línea real del commit que se etiqueta como `v0.2.0`.

## Registro de cada parada

Para cada breakpoint, guardar:
- Captura con el editor y el breakpoint visible.
- Variables inspeccionadas y valor observado.
- Pila de llamadas (call stack).
- Uso de Step Over y Step Into cuando aplique.
- En el breakpoint condicional, condición exacta configurada.
- En el logpoint, expresión exacta y mensaje registrado.

## Depuración de una prueba automatizada

Ejecutar en modo debug una prueba HTTP de producción, por ejemplo:

```bash
docker compose run --rm odoo odoo \
    --database=netpulse_test \
    --update=netpulse \
    --test-enable \
    --stop-after-init \
    --log-level=test
```

Configurar el depurador para detenerse dentro del controlador o del caso de uso invocado por la prueba. Guardar la captura y documentar la prueba ejecutada.

## Hallazgo, corrección y regresión

| Defecto o suposición detectada | Evidencia del depurador | Corrección aplicada | Prueba de regresión | Commit |
|---|---|---|---|---|
| Por completar con un hallazgo real | Por completar | Por completar | Por completar | Por completar |
