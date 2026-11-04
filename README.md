# Coin: локальный запуск и подготовка к Kubernetes

В Windows запустите Docker Desktop с Linux-контейнерами и выполните:

```powershell
cd C:\coin
docker compose up --build -d
```

Откройте http://localhost:3000. Первая загрузка образов и инициализация MySQL могут занять несколько минут. Создавайте, изменяйте и удаляйте покупки кнопками в интерфейсе. Данные находятся в именованном томе Docker `coin_coin-db`; `docker compose down` останавливает сервисы и сохраняет том, а `docker compose down -v` удаляет данные.

Локальные пароли по умолчанию предназначены только для демонстрации. Их можно заменить переменными `MYSQL_ROOT_PASSWORD` и `MYSQL_PASSWORD` до первого запуска, например в локальном `.env` (он исключён из Git). Изменение переменных не меняет автоматически пароли в уже созданном томе MySQL. Не используйте эти значения в Kubernetes.

Для разработки интерфейса оставьте Compose включённым и в другом терминале выполните `npm ci` и `npm run dev`. Vite проксирует `/api` на контейнер приложения на localhost:3000. Для обычной сборки используется база `/coin/`, а Docker собирает интерфейс с базой `/`. GitHub Pages предоставляет только статические файлы и сам не запускает API: для работающего CRUD ему понадобится отдельно доступный backend и соответствующая настройка доступа.

REST: `GET /api/assets`, `GET /api/assets/:id`, `POST /api/assets`, `PATCH /api/assets/:id`, `DELETE /api/assets/:id`, а также `/health/live` и `/health/ready`. Значения amount и price допускают до 12 цифр целой и 8 цифр дробной части; `purchased_at` передаётся в UTC как ISO 8601.

См. [инструкцию к практике](docs/K8S_LAB.md), [матрицу требований](docs/REQUIREMENTS.md) и [результаты тестов](docs/TEST_RESULTS.md). Образы в Docker Hub не опубликованы, Kubernetes не развёрнут.

---

Coin is a crypto portfolio tracker app.
It downloads up-to-date data on cryptocurrencies and allows the user to add their purchases.
The app automatically calculates profit, loss, and the current value of assets.
