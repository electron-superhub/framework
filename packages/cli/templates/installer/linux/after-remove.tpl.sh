#!/bin/bash

# 刷新 desktop 数据库
echo "Updating desktop database..."
update-desktop-database /usr/share/applications

# 取消注册自定义协议
echo "Unregistering URL scheme handler for @@{= it.protocol.scheme }..."
xdg-mime default "" "x-scheme-handler/@@{= it.protocol.scheme }"

echo "Unregistration complete. @@{= it.protocol.scheme }:// protocol has been removed."

exit 0
