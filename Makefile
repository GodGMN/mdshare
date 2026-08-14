.PHONY: test lint up down

test:
	cd server && npm test
	cd client && npm test

lint:
	npm run lint

up:
	docker compose up --build

down:
	docker compose down
