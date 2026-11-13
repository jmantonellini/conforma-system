# Operación de producción

Todo lo necesario para mantener el sistema funcionando y atender errores.

| Herramienta | Para qué                                                       | Dónde                                 |
| ----------- | -------------------------------------------------------------- | ------------------------------------- |
| Sentry      | Errores del servidor y del navegador, con usuario, URL y stack | sentry.io (mail con cada error nuevo) |
| Dozzle      | Logs en vivo con búsqueda                                      | http://localhost:8080 (por túnel SSH) |
| Beszel      | CPU, RAM, disco y contenedores, con alertas                    | http://localhost:8090 (por túnel SSH) |
| UptimeRobot | Aviso si el sistema se cae                                     | uptimerobot.com                       |
| `/salud`    | Estado de la app y de la base                                  | https://TU_DOMINIO/salud              |
| Dependabot  | PRs semanales con dependencias actualizadas                    | GitHub → Pull requests                |
| Backups     | Snapshots del droplet                                          | Panel de DigitalOcean                 |

## 1. Acceso rápido al droplet

En la Mac, agregar a `~/.ssh/config`:

```
Host conforma
  HostName IP_DEL_DROPLET
  User root
  LocalForward 8080 127.0.0.1:8080
  LocalForward 8090 127.0.0.1:8090
```

Con `ssh conforma` quedan abiertos Dozzle (http://localhost:8080) y Beszel (http://localhost:8090) mientras la sesión siga abierta. Ninguno de los dos está expuesto a internet.

Comandos útiles una vez dentro (`cd /var/www/conforma-system`):

```bash
docker compose logs -f --tail 200 app
docker compose ps
docker compose restart app
ls -lh ~/backups
```

## 2. Sentry

1. Crear cuenta en sentry.io (plan Developer, gratis) y un proyecto **SvelteKit**.
2. Copiar el DSN (Settings → Client Keys) y agregarlo al `.env` del droplet:
   ```
   SENTRY_DSN=https://...
   PUBLIC_SENTRY_DSN=https://...
   ```
3. `docker compose up -d app` para que tome las variables.
4. Probar: abrir una URL que falle o esperar el primer error. Llega un mail por cada error nuevo.

Cada error muestra el usuario (`username`), la ruta, el navegador y el commit desplegado (release = SHA del commit).

### Opcional: stacks legibles del navegador

Sin esto los errores del navegador muestran código minificado.

1. Sentry → Settings → Auth Tokens → crear un token de organización.
2. GitHub → repo → Settings → Secrets and variables → Actions:
   - Secret `SENTRY_AUTH_TOKEN` = el token.
   - Variables `SENTRY_ORG` y `SENTRY_PROJECT` = los slugs de la organización y el proyecto.

El próximo deploy sube los sourcemaps y los borra de la imagen.

## 3. Dozzle y Beszel (una sola vez)

En el droplet, después de un deploy que incluya estos servicios:

```bash
cd /var/www/conforma-system
docker compose up -d dozzle beszel
```

Beszel:

1. Abrir http://localhost:8090 (con `ssh conforma` abierto) y crear el usuario administrador.
2. **Add System**: nombre `conforma`, host `/beszel_socket/beszel.sock`. Copiar la **public key** que muestra.
3. En el `.env` del droplet: `BESZEL_KEY=ssh-ed25519 AAAA...`
4. `docker compose up -d beszel-agent` y confirmar en el panel que el sistema aparece en verde.
5. Settings → Notifications: configurar mail o Telegram.
6. En el sistema → campana: alertas de CPU > 80% (10 min), memoria > 85%, disco > 80% y "status" (caída).

Los tres servicios usan menos de 300 MB entre todos y se reinician solos con el droplet.

## 4. Aviso de caídas (UptimeRobot)

El monitor tiene que estar fuera del droplet: si el droplet se cae, nada adentro puede avisar.

1. Cuenta gratis en uptimerobot.com.
2. New monitor → tipo **Keyword**, URL `https://TU_DOMINIO/salud`, palabra `ok`, cada 5 minutos.
3. Alert contacts: mail y la app del celular (o Telegram).

`/salud` responde 503 si la base no responde, así que también avisa de problemas de base de datos.

## 5. Dependabot y CI

- Cada lunes llegan PRs con dependencias actualizadas (menores agrupadas en uno).
- Cada PR corre el workflow **CI** (check, tests y build). Si está en verde, se puede mergear: el merge despliega.
- Si una actualización mayor rompe algo, cerrar el PR y Dependabot no la vuelve a proponer hasta la próxima versión.

Protección de `main` (recomendado): Settings → Rules → Rulesets → New branch ruleset sobre `main`, con **Require status checks to pass** → `Verificar`, y agregar **Repository admin** en _Bypass list_ para poder seguir pusheando directo.

## 6. Logs de la app

Cada request deja una línea:

```
[http] POST remota crearEnvio 200 85ms vaneconforma
[http] GET /pedidos/36 500 120ms aleconforma
[login] Rechazado "vaneConforma": contraseña incorrecta (ip 181.x.x.x)
```

En Dozzle se puede filtrar por usuario (`vaneconforma`), por estado (`500`) o por `[login]`.

## 7. Cuando algo falla

1. **Mail de Sentry** → abrir el issue: usuario, ruta y stack. Reproducir local y corregir.
2. **Alguien dice "no me anda"** → Dozzle, buscar su usuario y ver qué requests fallaron.
3. **Aviso de UptimeRobot** → `ssh conforma`, `docker compose ps`; si `app` no está `healthy`, `docker compose logs --tail 100 app`.
4. **Alerta de Beszel por CPU o memoria** → ver en Beszel qué contenedor consume.
5. **Deploy fallido** → GitHub → Actions → último run. Si falla en migraciones, producción queda como estaba.
6. **Restaurar un backup de la base** (reemplaza todos los datos actuales; hacer antes un backup nuevo):
   ```bash
   docker compose stop app
   docker compose exec -T postgres psql -U postgres -c "DROP DATABASE conforma_db" -c "CREATE DATABASE conforma_db"
   gunzip -c ~/backups/conforma_FECHA.sql.gz | docker compose exec -T postgres psql -U postgres -d conforma_db
   docker compose start app
   ```
