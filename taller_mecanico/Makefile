# Makefile de conveniencia — los equivalentes en shell están en cada target.
# Uso: `make <target>`. Ejecutar `make help` para la lista completa.

.PHONY: help install install-dev test test-backend test-frontend test-cov clean

help:
	@echo "Targets disponibles:"
	@echo "  install          Instala dependencias de producción."
	@echo "  install-dev      Instala dependencias de desarrollo (tests, lint)."
	@echo "  test             Corre TODOS los tests (backend + frontend)."
	@echo "  test-backend     pytest del backend Django (rápido, ~5s)."
	@echo "  test-frontend    Vitest del frontend React."
	@echo "  test-cov         Tests backend con reporte de cobertura."
	@echo "  clean            Limpia caches (.pytest_cache, __pycache__, coverage)."

install:
	pip install -r requirements.txt

install-dev:
	pip install -r requirements-dev.txt
	cd frontend && npm install

test: test-backend test-frontend

test-backend:
	pytest

test-frontend:
	cd frontend && npm test

test-cov:
	pytest --cov=. --cov-report=term-missing --cov-report=html

clean:
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache htmlcov .coverage
	cd frontend && rm -rf coverage
