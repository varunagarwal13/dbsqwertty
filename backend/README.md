# Sakura Deck Java JDBC API

This replaces the Python `oracledb` service with a Java 8 JDBC service while preserving the frontend API on port `5000`.

1. Copy `.env.example` to `.env` and set the Oracle connection values. Do not commit `.env`.
2. Run `mvn compile exec:java` from this directory.

The service exposes `GET /products`, `GET /cart`, cart add/update/remove, `POST /checkout`, and `GET /orders` / `GET /orders/{id}`. It uses `DriverManager` with Oracle JDBC and explicit transactions for checkout.
