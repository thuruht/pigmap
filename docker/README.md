This Docker helper creates a small container with sqlite3 installed to execute the migration SQL files and inspect the resulting schema.

Usage:

Build the image:

```bash
docker build -t pigmap-migrate -f docker/Dockerfile .
```

Run the verifier (container will print PRAGMA table_info for tables):

```bash
docker run --rm -v "$PWD":/work -w /work pigmap-migrate /bin/bash -c "./docker/run_migrations.sh"
```
