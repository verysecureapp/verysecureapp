FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Use gunicorn for production-like environment, or python for dev.
# For now, using debug mode as it's implied this is a new app.
CMD ["python", "main.py"]
