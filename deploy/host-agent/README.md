# Docker host bridge setup

The **Host** admin page provides read-only container logs and one **Pull latest &
deploy** button. `/host` redirects to `/admin/host`. The bridge runs as a small Docker
container in its own Compose project. No systemd service, SSH keys, GitHub connection,
or host Python installation is required.

The site backend calls the bridge over a private Docker network using a shared
secret. The bridge has no published ports and accepts only authenticated health/log
reads and the fixed update operation. The browser never receives the secret, Docker
socket, shell, or arbitrary command access. Only the bridge mounts Docker's socket.
That mount grants Docker management privileges even though it is marked read-only;
the fixed API is the security boundary, not the mount flag.

## One-time setup

These instructions target a Linux VM with Docker Engine and Docker Compose already
installed, using the standard `/var/run/docker.sock`. The bridge image includes
Python and the Docker CLI/Compose plugin. Commands below assume the existing site
lives at `/opt/magic-portfolio`; substitute its real absolute path. Keep the existing
Compose project name to preserve the site's containers, networks and named volumes.

### 1. Copy the bridge files and configure the secret

Copy this repository's `deploy/host-agent` folder into your existing deployment
folder, giving `/opt/magic-portfolio/deploy/host-agent`. You can copy these files
manually; the VM does not need a Git checkout or GitHub integration. Keep the existing
`docker-compose.yml`, `.env` and `Caddyfile`.

Find the running site's Compose project name and generate a new secret:

```sh
cd /opt/magic-portfolio
sudo docker inspect magic-portfolio --format '{{ index .Config.Labels "com.docker.compose.project" }}'
openssl rand -hex 32
```

Add these values to the site's existing `.env` (do not replace its existing settings):

```ini
HOST_AGENT_TOKEN=paste-the-64-character-generated-secret
HOST_COMPOSE_DIRECTORY=/opt/magic-portfolio
HOST_COMPOSE_PROJECT_NAME=paste-the-existing-site-project-name
```

The site and bridge use this same token. Do not prefix it with `NEXT_PUBLIC_` or
commit `.env`. The site project must not be named `portfolio-host`, which is reserved
for the separate bridge. The bridge intentionally refuses to update its own project.

### 2. Connect the site to the private bridge network

Merge these additions into the VM's existing `docker-compose.yml`:

```yaml
services:
  portfolio:
    environment:
      # Keep all existing environment entries.
      HOST_AGENT_URL: http://host-bridge:8080
      HOST_AGENT_TOKEN: ${HOST_AGENT_TOKEN}
    networks:
      - default
      - host_control

networks:
  host_control:
    external: true
    name: portfolio-host-control
```

Keep the `default` network so the site can still communicate with PostgreSQL and
Caddy. If the site already uses custom networks, retain those too. Do not attach
other application services to `host_control`. Do not add the bridge service to this
file: its separate Compose project keeps it alive while it replaces site containers.
There is no socket or deployment-directory mount to add to the site container.

### 3. Start the bridge, then deploy the updated site once

From the deployment directory:

```sh
sudo docker compose --env-file .env -f deploy/host-agent/compose.yml up -d --build
sudo docker compose --env-file .env -f deploy/host-agent/compose.yml ps
```

The bridge creates the private `portfolio-host-control` network, builds its image
locally, and restarts automatically after VM reboots. Wait for it to report healthy.
The first build needs access to Docker Hub and Alpine's package repository.

If the site's image is private, log in once **inside the bridge**, using a registry
credential with image read permission when prompted:

```sh
sudo docker compose --env-file .env -f deploy/host-agent/compose.yml exec host-bridge docker login ghcr.io
```

Skip this for public images. Credentials stay in a dedicated Docker volume on the
VM, outside the website container. No SSH key is needed. The bridge does not inherit
the host's existing Docker login. The bridge's normal network allows registry access;
its shared control network is internal and no bridge ports are published.

After an image containing the updated site code is available, run these commands
with the existing site's project name substituted:

```sh
sudo docker compose --project-name YOUR_EXISTING_SITE_PROJECT pull
sudo docker compose --project-name YOUR_EXISTING_SITE_PROJECT up -d
```

Open `/admin/host` while signed in. Logs should appear and the update button should
be enabled. Future image deployments use that button. No external service triggers
or controls updates; the VM only contacts the registry to download images.

## Behavior and deployment files

- The button runs `docker compose pull`, then `docker compose up -d` against the
  configured site's `docker-compose.yml` and `.env`. It updates **all services in
  that file**, including database/proxy images whose tags have changed.
- A failed pull prevents `up`. Overlapping requests are rejected. Each command has
  a 15-minute timeout. The site can disconnect briefly; the page polls and reconnects.
- Job status survives site replacement and bridge restarts in a Docker volume.
  A bridge restart marks an unfinished job as interrupted; it does not retry it.
  Success means Compose finished successfully, not that all services are healthy.
- Container logs show the last 200 lines per service, capped at 128 KiB. Deployment
  output retains a bounded tail of the current/last command. Neither is editable.
- The deployment directory is mounted read-only into the bridge at **the same absolute
  path as on the VM**. This preserves host bind mounts such as `./Caddyfile`. Keep
  referenced env/config files in that directory, or add matching read-only mounts
  for any external files. Consolidate any Compose overrides into `docker-compose.yml`
  first; this bridge deliberately does not accept selectable Compose files.
- Keep deployment files administrator-controlled and do not mount them into the site.
  Updating image tags does not update the VM's Compose file, Caddyfile, `.env`, or
  bridge code. Those still need a maintenance step. Local source builds are not part
  of the button's operation; it deploys prebuilt images.
- Your current `latest` tag is published by the repository's image-build workflow.
  Wait until that image exists before clicking. There is no automatic rollback.

The Docker-only installation uses the official [Docker CLI image](https://github.com/docker-library/docs/blob/master/docker/README.md),
[Compose networking](https://docs.docker.com/compose/how-tos/networking/) and matching
[host bind-mount paths](https://docs.docker.com/engine/storage/bind-mounts/).

## Migrating from the earlier systemd installation

Skip this section if you never installed the old agent.

1. Complete steps 1–2 above. Remove `HOST_AGENT_SOCKET` and the
   `/run/portfolio-host` bind mount from the site's Compose service.
2. Stop the old agent only after any update finishes:
   `sudo systemctl disable --now portfolio-host`.
3. Start the bridge and recreate the site using step 3. The old job history is not
   migrated; the new bridge starts with fresh state.
4. Once the Docker bridge works, the old `/etc/systemd/system/portfolio-host.service`,
   `/etc/portfolio-host.env`, and `/opt/portfolio-host/agent.py` installation files can
   be removed. Run `sudo systemctl daemon-reload` after removing the unit.

## Maintenance and troubleshooting

Run these from the deployment directory:

```sh
# Bridge health and logs
sudo docker compose --env-file .env -f deploy/host-agent/compose.yml ps
sudo docker compose --env-file .env -f deploy/host-agent/compose.yml logs --tail 100 host-bridge

# Rebuild after copying updated bridge files; wait for any deployment to finish first
sudo docker compose --env-file .env -f deploy/host-agent/compose.yml up -d --build
```

- **Unavailable:** check bridge health, the shared token, site network attachment,
  deployment path and project name. Startup rejects missing files or an invalid token.
- **Pull denied:** use the bridge's `docker login` command above. A login on the host
  alone does not configure the bridge.
- **Docker permission/API errors:** this setup assumes standard rootful Docker.
  Rootless Docker or user namespace remapping needs corresponding socket permissions
  and mount changes. Update the bridge CLI image if the Engine requires a newer API.
- **Up failed/timed out:** inspect the VM before retrying; a partial update is possible.
- **No container logs:** confirm the services' logging driver supports Compose logs.
- **Rotate the token:** update `.env`, recreate the bridge using the command above,
  then recreate the site so both use the same new value.
- **Remove the feature:** remove the site's bridge environment entries and network
  attachment, recreate the site, then run
  `sudo docker compose --env-file .env -f deploy/host-agent/compose.yml down`.
  Remove the unused external network declaration from the site's file. Do not add
  `--volumes` unless you intend to erase bridge history and registry credentials.

## Verification

Local automated checks (no Docker daemon required):

```sh
python -B -m unittest discover -s deploy/host-agent -p 'test_*.py'
node --test scripts/test-host-api.mjs scripts/test-host-bridge.mjs
```

With Docker Engine running, run the isolated integration test:

```sh
python -B scripts/test-host-docker.py
```

It builds the bridge image and uses uniquely named disposable resources to verify
private HTTP authentication, input rejection, real image pulls, container replacement,
log reads, persisted status, and failure handling. It removes its test containers,
networks and volumes afterward; the local test image/build cache is retained. It never
targets the site's deployment project. On Docker Desktop, the test substitutes a
fixture volume for the Linux deployment bind mount, so VM-specific file paths and
permissions still need the checks below.

On the VM, confirm unauthenticated site API access returns 401, logs load when signed
in, one button click runs pull then up, overlapping updates are blocked, and the page
reconnects after site container replacement. The bridge must remain running throughout.
