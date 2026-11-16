# The machine the skills run on. The skills use curl, and the agent uses git to fetch them.
FROM debian:stable-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates curl git \
	&& rm -rf /var/lib/apt/lists/*
