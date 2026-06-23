#!/usr/bin/env bash

# Этот скрипт выполняется внутри созданного контейнера LXC на Debian.
# Он устанавливает все необходимые системные компоненты, включая git и Node.js,
# после чего клонирует и настраивает веб-интерфейс из форка fanhoi/ProxmoxVE-Local.

# Copyright (c) 2021-2026 community-scripts ORG
# Author: michelroegl-brunner
# License: MIT | https://github.com/community-scripts/ProxmoxVE/raw/main/LICENSE
# Source: https://github.com/fanhoi/ProxmoxVE-Local

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

# Установка необходимых пакетов для работы панели и git для клонирования форка
msg_info "Installing Dependencies"
$STD apt install -y \
  build-essential \
  sshpass \
  rsync \
  expect \
  git
msg_ok "Dependencies installed."

NODE_VERSION="24" setup_nodejs

# Клонируем форк напрямую из ветки main
msg_info "Cloning PVE Scripts local (fanhoi fork)"
git clone https://github.com/fanhoi/ProxmoxVE-Local.git /opt/ProxmoxVE-Local
cd /opt/ProxmoxVE-Local

# Настройка веб-приложения, генерация базы данных Prisma и сборка
msg_info "Configuring PVE Scripts local"
$STD npm install
cp .env.example .env
mkdir -p data
chmod 755 data

$STD npx prisma generate
$STD npx prisma migrate deploy

$STD npm run build
msg_ok "Installed PVE Scripts local"

# Создание и запуск службы systemd для автозапуска приложения
msg_info "Creating Service"
cat <<EOF >/etc/systemd/system/pvescriptslocal.service
[Unit]
Description=PVEScriptslocal Service
After=network.target

[Service]
WorkingDirectory=/opt/ProxmoxVE-Local
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl enable -q --now pvescriptslocal
msg_ok "Created Service"

motd_ssh
customize
cleanup_lxc
