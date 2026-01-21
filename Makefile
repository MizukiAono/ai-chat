# ========================================
# Yumi Chat - Makefile
# ========================================

.PHONY: help install dev build start test lint format clean docker-build docker-run docker-stop prisma-generate prisma-push

# デフォルトターゲット
help:
	@echo "Yumi Chat - Available Commands"
	@echo "==============================="
	@echo ""
	@echo "Setup:"
	@echo "  make install          - Install dependencies"
	@echo "  make setup            - Full setup (install + prisma generate)"
	@echo ""
	@echo "Development:"
	@echo "  make dev              - Start development server"
	@echo "  make build            - Build for production"
	@echo "  make start            - Start production server"
	@echo ""
	@echo "Testing:"
	@echo "  make test             - Run unit tests"
	@echo "  make test-watch       - Run unit tests in watch mode"
	@echo "  make test-coverage    - Run tests with coverage"
	@echo "  make test-e2e         - Run E2E tests"
	@echo "  make test-e2e-ui      - Run E2E tests with UI"
	@echo "  make test-e2e-headed  - Run E2E tests with browser visible"
	@echo "  make test-all         - Run all tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint             - Run ESLint"
	@echo "  make format           - Format code with Prettier"
	@echo "  make format-check     - Check code formatting"
	@echo ""
	@echo "Database:"
	@echo "  make prisma-generate  - Generate Prisma client"
	@echo "  make prisma-push      - Push schema to database"
	@echo "  make prisma-studio    - Open Prisma Studio"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build     - Build Docker image"
	@echo "  make docker-run       - Run with Docker Compose"
	@echo "  make docker-stop      - Stop Docker Compose"
	@echo "  make docker-logs      - Show Docker logs"
	@echo "  make docker-clean     - Remove Docker containers and images"
	@echo ""
	@echo "Deployment:"
	@echo "  make deploy-build     - Build for Cloud Run deployment"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean            - Remove build artifacts"
	@echo "  make clean-all        - Remove all generated files"

# ========================================
# Setup
# ========================================

install:
	npm ci

setup: install prisma-generate
	@echo "Setup complete!"

# ========================================
# Development
# ========================================

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

# ========================================
# Testing
# ========================================

test:
	npm run test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

test-e2e:
	npm run test:e2e

test-e2e-ui:
	npm run test:e2e:ui

test-e2e-headed:
	npm run test:e2e:headed

test-all: test test-e2e

# ========================================
# Code Quality
# ========================================

lint:
	npm run lint

format:
	npm run format

format-check:
	npm run format:check

# ========================================
# Database (Prisma)
# ========================================

prisma-generate:
	npx prisma generate

prisma-push:
	npx prisma db push

prisma-studio:
	npx prisma studio

# ========================================
# Docker
# ========================================

DOCKER_IMAGE_NAME = yumi-chat
DOCKER_TAG = latest

docker-build:
	docker build -t $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) .

docker-run:
	docker compose up -d

docker-stop:
	docker compose down

docker-logs:
	docker compose logs -f

docker-clean:
	docker compose down -v --rmi local

# ========================================
# Deployment
# ========================================

# Cloud Run deployment build
deploy-build: docker-build
	@echo "Docker image built: $(DOCKER_IMAGE_NAME):$(DOCKER_TAG)"
	@echo ""
	@echo "To deploy to Cloud Run:"
	@echo "  1. Tag the image:"
	@echo "     docker tag $(DOCKER_IMAGE_NAME):$(DOCKER_TAG) gcr.io/YOUR_PROJECT_ID/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)"
	@echo ""
	@echo "  2. Push to Container Registry:"
	@echo "     docker push gcr.io/YOUR_PROJECT_ID/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG)"
	@echo ""
	@echo "  3. Deploy to Cloud Run:"
	@echo "     gcloud run deploy $(DOCKER_IMAGE_NAME) \\"
	@echo "       --image gcr.io/YOUR_PROJECT_ID/$(DOCKER_IMAGE_NAME):$(DOCKER_TAG) \\"
	@echo "       --platform managed \\"
	@echo "       --region asia-northeast1 \\"
	@echo "       --allow-unauthenticated"

# ========================================
# Cleanup
# ========================================

clean:
	rm -rf .next
	rm -rf out
	rm -rf test-results
	rm -rf playwright-report

clean-all: clean
	rm -rf node_modules
	rm -rf .playwright-mcp
