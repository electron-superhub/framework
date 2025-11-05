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

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!macro customPageAfterChangeDir
  ; 插入自定义页面
  Page custom ValidatePathConfirmCreate ValidatePathConfirmLeave
  
  Function ValidatePathConfirmCreate    
    ${if} ${isUpdated}
      Abort
    ${endif}
    
    nsDialogs::Create 1018
    Pop $0
    ${if} $0 == error
      Abort
    ${endif}
    
    ${NSD_CreateLabel} 0u 0u 100% 12u "请确认安装路径，然后点击“安装”以继续安装。"
    Pop $R0
    
    ${NSD_CreateLabel} 0u 16u 100% 28u "当前路径：$INSTDIR"
    Pop $R1

    ${NSD_CreateLabel} 0u 48u 100% 10u "若路径含有非英文字符（中文/日文/韩文等）或特殊符号，请返回上一步修改。"
    Pop $R2
    SetCtlColors $R2 0xFF0000 0xFFFF00

    nsDialogs::Show
  FunctionEnd

  Function ValidatePathConfirmLeave    
    StrCpy $R0 '^[A-Za-z0-9:\\._\- ]+$$'
    Strcpy $R1 "$INSTDIR"
    StrCpy $R2 "if ('$R1' -match '$R0') { exit 2 } else { exit 3 }"
    nsExec::Exec 'powershell -NoProfile -NonInteractive -Command "$R2"'
    Pop $0
  
    StrCmp $0 "2" passed
      MessageBox MB_OK|MB_ICONEXCLAMATION "安装路径仅能包含英文字符，不支持中文字符，请返回上一步重新选择路径"
      Abort
    passed:
  FunctionEnd
!macroend