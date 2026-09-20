# One-file deployment for portfolio-site

Use [docker-compose.unified.yml.example](../docker-compose.unified.yml.example) as
`/home/ubuntu/portfolio-site/docker-compose.yml`. This variant keeps `.env`,
`Caddyfile` and one Compose file on the VM. It preserves the existing `portfolio-site`
project, database/Caddy volumes, and external `portfolio-host-control` network.
The bridge reuses the original `portfolio-host_bridge_state` and
`portfolio-host_registry_auth` volumes, retaining history and registry credentials.

The bridge is assigned the `host` profile. Normal site updates exclude it; manual
bridge updates explicitly target `host-bridge`. Its `COMPOSE_PROFILES` environment
variable is empty, and the updated bridge code also clears profiles when invoking
Compose. Do not remove `profiles: [host]`, add the bridge to the site's `depends_on`,
or assign unprofiled update services a dependency on the bridge.

## Migrate the existing two-file installation

Wait until any in-progress admin deployment has finished. Save the example as
`docker-compose.yml`, retaining the old `docker-compose.host.yml` until migration
has succeeded. Keep `.env` unchanged, with:

```ini
HOST_COMPOSE_DIRECTORY=/home/ubuntu/portfolio-site
HOST_COMPOSE_PROJECT_NAME=portfolio-site
```

Validate and pull the bridge before stopping the old one:

```sh
cd /home/ubuntu/portfolio-site
sudo docker compose --project-name portfolio-site --profile host config --quiet &&
sudo docker compose --project-name portfolio-site pull host-bridge
```

Then stop only the old bridge and start the unified stack:

```sh
sudo docker compose --project-name portfolio-host -f docker-compose.host.yml stop host-bridge &&
sudo docker compose --project-name portfolio-site --profile host up -d --wait --wait-timeout 120
```

Confirm `/admin/host` loads logs. The website's database and Caddy volumes retain
their names; the new bridge attaches to the existing state and credentials volumes.
The two bridge instances must not run simultaneously against the same state volume.

After successful migration, remove the stopped old bridge container and its file:

```sh
sudo docker compose --project-name portfolio-host -f docker-compose.host.yml rm -f host-bridge &&
sudo rm -- docker-compose.host.yml
```

Do not run `down --volumes` against the old project: the unified stack still uses
its volumes and control network. If the new bridge fails before cleanup, stop it
with `sudo docker compose stop host-bridge` and restart the old bridge using
`sudo docker compose --project-name portfolio-host -f docker-compose.host.yml start host-bridge`.

## Subsequent updates

Use the admin button to update the site stack. To update the bridge itself, when no
site update is in progress:

```sh
sudo docker compose pull host-bridge &&
sudo docker compose up -d --wait host-bridge
```

To start all services manually, use `sudo docker compose --profile host up -d`.
Docker's restart policy restarts the existing bridge after a VM reboot regardless
of the profile. No active Compose process is needed on the host.

## Fresh VM

This migration-oriented example deliberately declares the old bridge resources as
external. On a fresh VM, restore the relevant data first or create empty bridge
resources before starting the stack:

```sh
sudo docker network create --internal portfolio-host-control
sudo docker volume create portfolio-host_bridge_state
sudo docker volume create portfolio-host_registry_auth
```

Existing bridge credentials and job history do not transfer to another VM by image
pull. Database migration is separate from this Compose configuration change.

## Verification

`python -B scripts/test-host-docker.py --unified` tests a disposable single-project
stack. It deliberately sets `COMPOSE_PROFILES=host` in both the deployment `.env` and
the bridge's parent environment, then confirms updates exclude the profiled bridge
and an invalid-image canary, replace only the workload, and preserve bridge state.
