.PHONY: build test test-dry test-docker test-sync shell clean

IMAGE := dev-env-test

# Build the test Docker image
build:
	docker build -t $(IMAGE) -f Dockerfile.test .

# Test a specific task: make test TASK=zsh
test: build
ifndef TASK
	@echo "Usage: make test TASK=<task_name>"
	@echo "Example: make test TASK=zsh"
	@exit 1
endif
	docker run --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		-e XDG_CONFIG_HOME=/home/testuser/.config \
		-e DEV_ENV=/home/testuser/dev-env \
		$(IMAGE) \
		sh -c "sudo apt-get update -qq && deno task run $(TASK)"

# Run all tasks in dry-run mode
test-dry: build
	docker run --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		deno task run --dry

# Test the docker task (requires privileged mode)
test-docker: build
	docker run --rm \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		sh -c "sudo apt-get update -qq && deno task run docker"

# Test the sync command
test-sync: build
	docker run --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		deno task sync

# Run all tasks (full integration test)
test-all: build
	docker run --rm \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		sh -c "sudo apt-get update -qq && deno task run"

# Open interactive shell for debugging
shell: build
	docker run -it --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		-e XDG_CONFIG_HOME=/home/testuser/.config \
		-e DEV_ENV=/home/testuser/dev-env \
		$(IMAGE) \
		/bin/bash

# Remove the test image
clean:
	docker rmi $(IMAGE) || true
