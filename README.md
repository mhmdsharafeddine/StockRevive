# StockRevive

StockRevive connects customers and electronics stores through real-time inventory visibility, a retail marketplace, and future wholesale and insights workflows.

## Current milestone

- Django + Django REST Framework backend
- `Store` and `Product` models
- Read-only API endpoints for stores, products, and homepage data
- React homepage built with reusable section/card components
- Local hero image asset matching the Figma direction

## Backend

```bash
python -m pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

API endpoints:

- `http://127.0.0.1:8000/api/homepage/`
- `http://127.0.0.1:8000/api/products/`
- `http://127.0.0.1:8000/api/stores/`

## Frontend

```bash
cd frontend
npm.cmd install
npm.cmd run dev
```

The React app expects the backend at `http://127.0.0.1:8000/api` by default. Set `VITE_API_BASE_URL` if you run the backend somewhere else.
