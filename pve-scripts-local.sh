#!/usr/bin/env bash

# Этот скрипт используется для инициализации установки веб-панели PVE Scripts Local на хосте Proxmox VE.
# Он создает LXC-контейнер и подменяет внутренний скрипт установки, чтобы приложение скачивалось из форка fanhoi/ProxmoxVE-Local.

# Перехватываем функцию curl, чтобы подменить скрипт установки внутри контейнера на нашу версию из форка
curl() {
  if [[ "$*" == *"install/pve-scripts-local-install.sh"* ]]; then
    command curl -fsSL "https://raw.githubusercontent.com/fanhoi/ProxmoxVE-Local/main/pve-scripts-local-install.sh"
  else
    command curl "$@"
  fi
}
export -f curl

# Загружаем оригинальный build.func, содержащий общую логику создания контейнеров Proxmox
source <(command curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)

# Данные для настройки LXC-контейнера
APP="PVE-Scripts-Local"
var_tags="${var_tags:-pve-scripts-local}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-4096}"
var_disk="${var_disk:-10}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_arm64="${var_arm64:-yes}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources
  if [[ ! -d /opt/ProxmoxVE-Local ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi
  msg_custom "🚀" "${GN}" "The app offers a built-in updater. Please use it."
  exit
}

start
build_container
description

msg_ok "Completed successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW}Access it using the following URL:${CL}"
echo -e "${GATEWAY}${BGN}http://${IP}:3000${CL}"
