#!/bin/bash

# 刷新 desktop 数据库
echo "Updating desktop database..."
update-desktop-database /usr/share/applications

# 注册自定义协议
echo "Registering URL scheme handler for @@{= it.protocol.scheme }..."
xdg-mime default "@@{= it.name }.desktop" "x-scheme-handler/@@{= it.protocol.scheme }"

echo "Registration complete. @@{= it.protocol.scheme }:// protocol is now handled by @@{= it.name }."

exit 0
