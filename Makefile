.PHONY: build test test-dry test-docker test-sync test-all test-full shell clean

IMAGE := dev-env-test
STACK ?= primeagen

# Build the test Docker image
build:
	docker build -t $(IMAGE) -f Dockerfile.test .

# Test a specific task: make test TASK=zsh
# Optionally specify stack: make test TASK=zsh STACK=larr
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
		sh -c "cp test/secrets/*.enc.yaml stacks/$(STACK)/secrets/ && sudo apt-get update -qq && deno task run -s $(STACK) $(TASK)"

# Run all tasks in dry-run mode
test-dry: build
	docker run --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		deno task run -s $(STACK) --dry

# Test the docker task (requires privileged mode)
test-docker: build
	docker run --rm \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		sh -c "cp test/secrets/*.enc.yaml stacks/$(STACK)/secrets/ && sudo apt-get update -qq && deno task run -s $(STACK) docker"

# Test the sync command
test-sync: build
	docker run --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		deno task sync -s $(STACK)

# Run all tasks (full integration test)
test-all: build
	docker run --rm \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e HOME=/home/testuser \
		-e USER=testuser \
		$(IMAGE) \
		sh -c "cp test/secrets/*.enc.yaml stacks/$(STACK)/secrets/ && sudo apt-get update -qq && deno task run -s $(STACK)"

# Open interactive shell for debugging
shell: build
	docker run -it --rm \
		-e HOME=/home/testuser \
		-e USER=testuser \
		-e XDG_CONFIG_HOME=/home/testuser/.config \
		-e DEV_ENV=/home/testuser/dev-env \
		$(IMAGE) \
		/bin/bash

# Full integration test: sync configs first, run tasks in zsh (realistic PATH)
# Uses zsh -i -l to force interactive mode so .zshrc is fully sourced
test-full: build
	docker run -it --rm \
		--privileged \
		-v /var/run/docker.sock:/var/run/docker.sock \
		-e HOME=/home/testuser \
		-e USER=testuser \
		-e XDG_CONFIG_HOME=/home/testuser/.config \
		-e DEV_ENV=/home/testuser/dev-env \
		-e REALISTIC_TEST=1 \
		$(IMAGE) \
		sh -c "cp test/secrets/*.enc.yaml stacks/$(STACK)/secrets/ && \
		       sudo apt-get update -qq && \
		       deno task sync -s $(STACK) && \
		       exec zsh -i -l -c 'deno task run -s $(STACK) $(TASK) && exec zsh -i -l'"

# Remove the test image
clean:
	docker rmi $(IMAGE) || true
