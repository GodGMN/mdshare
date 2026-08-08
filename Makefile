.PHONY: test up down

test:
	cd server && npm test

up:
	docker compose up --build

down:
	docker compose down
