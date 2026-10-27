' Starts the code.daemon desktop pet without a console window.
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
cmd = "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & dir & "\CodeDaemon.ps1"""
CreateObject("WScript.Shell").Run cmd, 0, False
