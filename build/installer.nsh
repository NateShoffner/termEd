!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!ifndef BUILD_UNINSTALLER
Var AddEdToPathCheckbox
Var AddEdToPath
!endif

!macro customPageAfterChangeDir
  Page custom edPathPageCreate edPathPageLeave
!macroend

!ifndef BUILD_UNINSTALLER
Function edPathPageCreate
  nsDialogs::Create 1018
  Pop $0
  ${If} $0 == error
    Abort
  ${EndIf}
  ${NSD_CreateLabel} 0 0 100% 24u "termEd can install an 'ed' command so you can summon Ed from any terminal window."
  Pop $0
  ${NSD_CreateCheckbox} 0 28u 100% 12u "Add the 'ed' command to my PATH"
  Pop $AddEdToPathCheckbox
  ${NSD_SetState} $AddEdToPathCheckbox ${BST_CHECKED}
  nsDialogs::Show
FunctionEnd

Function edPathPageLeave
  ${NSD_GetState} $AddEdToPathCheckbox $AddEdToPath
FunctionEnd
!endif

!macro customInstall
  ${If} $AddEdToPath == ${BST_CHECKED}
    ExecWait `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$d='$INSTDIR\resources\bin'; $$p=[Environment]::GetEnvironmentVariable('Path','User'); if (($$p -split ';') -notcontains $$d) { [Environment]::SetEnvironmentVariable('Path', ($$p.TrimEnd(';') + ';' + $$d), 'User') }"`
  ${EndIf}
!macroend

!macro customUnInstall
  ExecWait `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$d='$INSTDIR\resources\bin'; $$p=[Environment]::GetEnvironmentVariable('Path','User'); $$n=(($$p -split ';') | Where-Object { $$_ -and $$_ -ne $$d }) -join ';'; [Environment]::SetEnvironmentVariable('Path', $$n, 'User')"`
!macroend
