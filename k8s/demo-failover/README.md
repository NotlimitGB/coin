# Демонстрация failover Coin на Kubernetes 1.28

Здесь только подготовка: развёртывание, изменение VirtualBox и испытание выполняются вручную. Существующие `coin-app`, Percona, ProxySQL, PV/PVC и Secrets манифесты демонстрации не изменяют. Приложение демонстрации использует ту же базу и видит те же покупки: не удаляйте чужие записи.

`Windows :8080 → NAT worker1 :30080 → NodePort → frontend/Nginx на worker1 → coin-demo-backend (ClusterIP) → backend → db → ProxySQL → PXC`.

Backend не хранит данные локально; его новая реплика создаётся контроллером ReplicaSet. Во время отказа API временно недоступен. Frontend отдаёт собственный `/health` без обращения к backend и продолжает загружаться. Nginx повторно разрешает DNS Service и проксирует путь `/api/...` без изменения; для кластера с DNS-доменом отличным от `cluster.local` замените имя в `default.conf.template`, пересоберите образ и примените конфигурацию заново.

## 1. Сборка и публикация образов

На Windows в PowerShell, в `C:\coin` и с запущенным Docker Desktop:

```powershell
docker login
docker build --platform linux/amd64 -f Dockerfile.frontend -t notlimitgb/coin-frontend:failover-v1 .
docker build --platform linux/amd64 -f Dockerfile.backend -t notlimitgb/coin-backend:failover-v1 .
docker push notlimitgb/coin-frontend:failover-v1
docker push notlimitgb/coin-backend:failover-v1
```

Для push войдите в аккаунт, имеющий права публикации в `notlimitgb`. Образы должны быть доступны containerd на обеих ВМ (публичные либо с заранее настроенным доступом к приватному реестру). Убедитесь, что ВМ имеют архитектуру `x86_64`; для другой архитектуры потребуются совместимые образы. Теги имеют `IfNotPresent`: при пересборке с тем же тегом узлы могут использовать старый локальный образ. Предпочитайте новый тег и обновите оба манифеста; не удаляйте существующие образы без необходимости.

## 2. Проверки стенда и доступ Windows

На master в каталоге репозитория ветки `feat/k8s-lab`, содержащей эти файлы:

```bash
kubectl get nodes -o wide
kubectl get nodes -L kubernetes.io/hostname
kubectl get pods -o wide
kubectl get deployments
kubectl get svc -A -o wide
kubectl get svc db -o yaml
kubectl get deployment coin-app -o jsonpath='{range .spec.template.spec.containers[*].env[*]}{.name}{"\n"}{end}'
kubectl get deployment coin-app -o jsonpath='{range .spec.template.spec.containers[*].env[?(@.name=="DB_HOST")]}{.name}={.value}{"\n"}{end}'
kubectl get deployment coin-app -o jsonpath='{range .spec.template.spec.containers[*].env[?(@.name=="DB_NAME")]}{.name}={.value}{"\n"}{end}'
kubectl get deployment coin-app -o jsonpath='{range .spec.template.spec.containers[*].env[?(@.name=="DB_USER")]}{.name}={.value}{"\n"}{end}'
kubectl get deployment coin-app -o jsonpath='{range .spec.template.spec.containers[*].env[?(@.name=="DB_PASSWORD")]}{.valueFrom.secretKeyRef.name}{" / "}{.valueFrom.secretKeyRef.key}{"\n"}{end}'
kubectl get secret coin-db -o go-template='{{range $k,$v := .data}}{{$k}}{{"\n"}}{{end}}'
```

Убедитесь, что Ready именно `worker1` и `worker2`, метки `kubernetes.io/hostname` совпадают с этими именами, NodePort 30080 входит в диапазон `--service-node-port-range` кластера и свободен, Secret `coin-db` содержит ключ `password`, а сервис `db` ведёт через ProxySQL к уже работающей базе `coin`. Сверьте DB_HOST, DB_NAME, DB_USER и ссылку на Secret старого `coin-app` с новым backend: настройки стенда могли измениться. Последняя команда выводит только имена ключей секрета. Если сервисы или имена отличаются, скорректируйте только манифест новой демонстрации; не создавайте и не переустанавливайте базу. Убедитесь, что таблица `assets` уже инициализирована. Проверка `/health/ready` требует доступа к ней.

На worker1 проверьте NAT-адрес первого адаптера командой `ip -4 addr` и убедитесь, что это `10.0.2.15`, либо используйте фактический адрес. В VirtualBox Manager откройте настройки **worker1 → Сеть → Адаптер 1 (NAT) → Дополнительно → Проброс портов** и вручную добавьте правило:

| Имя | Протокол | IP хоста | Порт хоста | IP гостя | Порт гостя |
| --- | --- | --- | --- | --- | --- |
| coin-demo | TCP | 127.0.0.1 | 8080 | 10.0.2.15 | 30080 |

Не меняйте адаптер 2 или внутреннюю сеть. Если порт 8080 уже занят на Windows, выберите другой свободный порт хоста и измените адрес в браузере. Проброс работает, только если kube-proxy принимает NodePort на NAT-адресе worker1 и правила брандмауэра разрешают соединение; проверьте `nodePortAddresses`, если ограничен список интерфейсов. После развёртывания можно проверить на worker1 `curl -i http://10.0.2.15:30080/health`, а на Windows — `Test-NetConnection 127.0.0.1 -Port 8080`. Менять настройки VirtualBox автоматически не требуется.

### При нехватке памяти

По умолчанию старое приложение остаётся работать. Если места недостаточно, пользователь может **временно** уменьшить только его Deployment, предварительно сохранив исходное число реплик:

```bash
OLD_REPLICAS=$(kubectl get deployment coin-app -o jsonpath='{.spec.replicas}')
printf 'Исходное число реплик coin-app: %s\n' "$OLD_REPLICAS"
kubectl scale deployment coin-app --replicas=0
```

Запишите значение `OLD_REPLICAS` на случай закрытия терминала. По окончании восстановите сохранённое значение: `kubectl scale deployment coin-app --replicas="$OLD_REPLICAS"`. Не масштабируйте PXC или ProxySQL и не удаляйте PVC ради освобождения памяти.

## 3. Развёртывание демонстрации

Коммит с этими файлами должен оказаться на master. Если он пока только на Windows, сначала проверьте рабочее дерево и опубликуйте ветку обычным `git push origin feat/k8s-lab` или безопасно перенесите файлы другим способом. На master перед переключением проверьте `git status --short`; не перезаписывайте местные изменения. При использовании Git после публикации выполните `git fetch origin`, переключитесь на ветку и обновите её `git pull --ff-only`. Само выполнение этой инструкции изменений в репозиторий автоматически не отправляет.

После проверки, получения коммита и публикации образов на master:

```bash
cd ~/coin                       # либо фактический путь к репозиторию на master
git status --short               # убедитесь, что переключение безопасно
git fetch origin
git switch feat/k8s-lab
git pull --ff-only
kubectl kustomize k8s/demo-failover
kubectl apply -k k8s/demo-failover
kubectl rollout status deployment/coin-demo-frontend --timeout=180s
kubectl rollout status deployment/coin-demo-backend --timeout=180s
```

Kustomize создаёт ConfigMap `coin-demo-nginx` из `default.conf.template`; при изменении конфигурации повторно примените манифесты и выполните `kubectl rollout restart deployment/coin-demo-frontend`: файл подключён через subPath и уже работающий Pod не перечитает его автоматически. Деплойменты используют стратегию Recreate для последовательного обновления. `kubectl apply -k` не применяется к старым ресурсам. Если образы приватные, добавьте существующий imagePullSecret в спецификации новых Pod и убедитесь, что оба узла имеют доступ.

## 4. Сценарий преподавателю

### A. До отказа

```bash
kubectl get nodes -o wide
kubectl get pods -o wide
kubectl get deployments
kubectl get svc
kubectl get pods -l app=coin-demo-frontend -o wide
kubectl get pods -l app=coin-demo-backend -o wide
kubectl get endpoints coin-demo-backend -o wide
kubectl get endpointslices -l kubernetes.io/service-name=coin-demo-backend
kubectl get pods -o wide > "$HOME/coin-demo-before.txt"
```

Зафиксируйте имена Pod и узлы: frontend должен быть Ready на `worker1`, backend — Ready на `worker2`; у backend Service должен быть готовый endpoint на порт 3000. Предпочтение worker2 не гарантирует первоначального назначения. Если backend оказался на worker1, проверьте Ready, свободные ресурсы и события `kubectl describe pod -l app=coin-demo-backend`; после устранения причины можно выполнить `kubectl rollout restart deployment/coin-demo-backend`, дождаться готовности и снова проверить NODE. При повторном размещении на worker1 не начинайте испытание: Kubernetes вправе выбрать этот узел. Не используйте принудительное удаление Pod или изменение размещения базы.

### B. Рабочее приложение

На Windows откройте **http://localhost:8080**. Проверьте, что список покупок загружается из существующей базы. Создайте собственную тестовую покупку и запишите её параметры. Обновите страницу и убедитесь, что запись сохранилась. В PowerShell можно также вызвать `Invoke-RestMethod http://localhost:8080/api/assets`.

### C. Отказ worker2

На master оставьте работающими master и worker1. В трёх отдельных терминалах на master наблюдайте (каждая команда с `-w` работает непрерывно):

```bash
kubectl get nodes -w
kubectl get pods -o wide -w
kubectl get endpoints coin-demo-backend -w
```

В VirtualBox выключите **только worker2**. Зафиксируйте время, дождитесь перехода узла в NotReady/Unknown, удаления старого и создания нового backend Pod на worker1 и появления готового endpoint. `tolerationSeconds: 30` отсчитывается после соответствующего taint, а не от момента выключения. Обнаружение отказа, rate limit контроллеров, доступность образа и MySQL, ресурсы и иные настройки влияют на задержку: мгновенное восстановление не гарантируется. Не требуется вручную выполнять `apply`, `scale` или принудительное удаление Pod.

### D. После восстановления

```bash
kubectl get nodes -o wide
kubectl get pods -l app=coin-demo-frontend -o wide
kubectl get pods -l app=coin-demo-backend -o wide
kubectl get endpoints coin-demo-backend -o wide
kubectl get pods -o wide > "$HOME/coin-demo-after.txt"
```

Сохраните время и новые имена Pod/узлы, сравните `coin-demo-before.txt` и `coin-demo-after.txt`. Frontend должен оставаться на worker1, новый backend — работать на worker1. В Windows обновите `http://localhost:8080`, дождитесь восстановления `/api/assets`, проверьте контрольную запись и выполните CRUD с собственной тестовой записью. Пока API недоступен, интерфейс доступен, но операции могут выдавать ошибку. Не повторяйте операцию создания вслепую после таймаута: она могла быть выполнена до потери ответа.

PXC сможет работать после потери одного узла только при сохранённом кворуме и готовности оставшихся узлов и ProxySQL. Если они не готовы, backend readiness тоже не пройдёт. При разделении сети старый Pod может некоторое время продолжать выполняться на недоступной машине; обе backend-реплики не имеют локального состояния, но автоматическое переключение само по себе не защищает от повторной записи. Не форсируйте восстановление PXC и не удаляйте тома; исследуйте состояние оператором и действуйте по документации Percona.

### E. Возвращение worker2

Включите worker2, дождитесь `Ready`; проверьте `kubectl get nodes -o wide`, `kubectl get pods -o wide`, `kubectl get pxc,pvc` и восстановление PXC/ProxySQL, затем повторите чтение покупок и проверку приложения. Предпочтительная affinity не перемещает уже работающий backend обратно автоматически; оставаться на worker1 допустимо.

## 5. Очистка только демонстрации

```bash
kubectl delete -k k8s/demo-failover
kubectl get deploy,svc,configmap -l app=coin-demo-frontend
kubectl get deployment,service coin-demo-backend
```

Kustomize удаляет два Deployment, два Service и ConfigMap `coin-demo-nginx`; он не удаляет базу, тома, Secrets или старый `coin-app`. Проверка по метке должна показать отсутствие frontend-ресурсов, а запрос backend — NotFound. ConfigMap можно дополнительно проверить командой `kubectl get configmap coin-demo-nginx`: после удаления ожидается NotFound. При желании вручную удалите только созданное правило NAT в VirtualBox. Восстановите записанное ранее количество реплик старого `coin-app`, если изменяли его. Тестовая покупка остаётся в базе до её явного удаления пользователем через интерфейс.


## Локальные проверки подготовки

12 ноября 2026 на Windows собраны оба образа для `linux/amd64`; React production build и `nginx -t` прошли. В отдельных временных Docker-контейнерах проверены запуск backend без frontend и с frontend-файлами, `/health/live`, отказ `/health/ready` при недоступной базе, завершение backend по SIGTERM, отдача SPA, проксирование `/api/assets` и доступность frontend при отсутствующем и остановленном backend. Контейнеры не подключались к существующей базе.

`kubectl kustomize` и локальные проверки пяти ресурсов подтвердили labels/selectors, порты, node affinity, tolerations и ссылку на Secret. Кластер, фактическое размещение, NAT, подключение к ProxySQL и failover не проверялись и требуют описанных выше действий пользователя.
