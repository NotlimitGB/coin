# Матрица требований

Источник: K8s.pdf, 35 страниц. Реализация Kubernetes является подготовкой и не подтверждает работу кластера.

| Требование методички | Реализация Coin | Проверка | Статус |
| --- | --- | --- | --- |
| Образы в Docker Hub, стр. 5–6 | Dockerfile и sql/Dockerfile, теги в K8S_LAB.md | build, push, pull | Образы собраны локально; публикация требует учётной записи Docker Hub |
| Три Ubuntu 22 ВМ, стр. 6–15 | Инструкция K8S_LAB.md | kubeadm, kubectl get nodes | Позже; ВМ не создавались |
| Три PXC и два ProxySQL, локальные PV, стр. 16–20, 26–28 | k8s/local-storage.yaml и percona-xtradb-cluster.yaml | Проверка Pod/PVC и кворума | Подготовлено, на кластере не проверено |
| DNS-алиас и сервис ProxySQL, стр. 17–20, 28 | mysql-proxysql-svc.yaml, db-externalname.yaml | kubectl get endpoints и подключение из Pod | Подготовлено, не проверено на кластере |
| Проверка SQL-образа и Job, стр. 20, 28–30 | temp-pod.yaml, db-loader.yaml | cat init.sql, logs job/db-loader | SQL проверен локально; Job не проверена на кластере |
| Несколько реплик и CRUD, стр. 21, 30 | app-deployment.yaml, React и Express | kubectl get pods; CRUD через браузер | Проверено локально через Compose и браузер; в Kubernetes не проверено |
| MetalLB, стр. 22, 31–32 | metallb-config.yaml с примером пула | kubectl get svc coin-app | Подготовлено, выбрать доступный пул |
| Восстановление PXC, стр. 22–23, 32 | Штатный pxc.autoRecovery оператора вместо опасного учебного контроллера | Логи оператора; см. K8S_LAB.md | Подготовлено; на кластере не проверено |
| Проверка отказа каждого worker, стр. 33–35 | Последовательность в K8S_LAB.md | Выключение по одному worker и CRUD | Не выполнялось |

Реальное состояние проверок приложения см. TEST_RESULTS.md. Для изображений в PDF дополнительно доступен исходный учебный репозиторий; не считать его манифесты проверенными или безопасными без адаптации.
