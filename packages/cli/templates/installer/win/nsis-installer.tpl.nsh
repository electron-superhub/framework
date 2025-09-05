# windows 注册表写入app的唤起协议
!define ESHO_APP_PROTOCOL_SCHEME "@@{= it.protocol.scheme }"

!macro customInstall
  DetailPrint "Register ${ESHO_APP_PROTOCOL_SCHEME} URI Handler"
  DeleteRegKey HKCR "${ESHO_APP_PROTOCOL_SCHEME}"
  WriteRegStr HKCR "${ESHO_APP_PROTOCOL_SCHEME}" "" "URL:${ESHO_APP_PROTOCOL_SCHEME}"
  WriteRegStr HKCR "${ESHO_APP_PROTOCOL_SCHEME}" "URL Protocol" ""
  WriteRegStr HKCR "${ESHO_APP_PROTOCOL_SCHEME}\shell" "" ""
  WriteRegStr HKCR "${ESHO_APP_PROTOCOL_SCHEME}\shell\open" "" ""
  WriteRegStr HKCR "${ESHO_APP_PROTOCOL_SCHEME}\shell\open\command" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME} %1"
!macroend

!macro customUnInstall
  DeleteRegKey HKCR "${ESHO_APP_PROTOCOL_SCHEME}"
!macroend
