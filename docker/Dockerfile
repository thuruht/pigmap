FROM debian:stable-slim

RUN apt-get update && apt-get install -y sqlite3 bash && rm -rf /var/lib/apt/lists/*

WORKDIR /work

COPY . /work

CMD ["/bin/bash"]
