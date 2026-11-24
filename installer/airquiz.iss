; Inno Setup script — builds AirQuiz-Setup.exe from the PyInstaller folder build.
; Usage (CI does this): iscc /DAppVersion=1.2.0 installer\airquiz.iss
#ifndef AppVersion
  #define AppVersion "0.0.0"
#endif

[Setup]
AppId={{6B0E3B6C-3A57-4C55-9B1A-0A1F2C3D4E5F}
AppName=AirQuiz
AppVersion={#AppVersion}
AppPublisher=Salah Eddine Medkour
AppPublisherURL=https://github.com/salahmed-ctrlz/AirQuiz
DefaultDirName={autopf}\AirQuiz
DefaultGroupName=AirQuiz
DisableProgramGroupPage=yes
OutputDir=..\release
OutputBaseFilename=AirQuiz-Setup
Compression=lzma2
SolidCompression=yes
; Needed to add the firewall rule, so students' phones can reach the host
PrivilegesRequired=admin
ArchitecturesInstallIn64BitMode=x64compatible
WizardStyle=modern
SetupIconFile=..\public\icon.ico
UninstallDisplayIcon={app}\AirQuiz.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; Flags: checkedonce

[Files]
Source: "..\release\AirQuiz\*"; DestDir: "{app}"; Flags: recursesubdirs ignoreversion

[Icons]
; Data goes to the user's Documents so it survives updates and needs no admin rights
Name: "{autodesktop}\AirQuiz"; Filename: "{app}\AirQuiz.exe"; Tasks: desktopicon; Parameters: ""; WorkingDir: "{app}"
Name: "{group}\AirQuiz"; Filename: "{app}\AirQuiz.exe"; WorkingDir: "{app}"
Name: "{group}\AirQuiz data folder"; Filename: "{userdocs}\AirQuizData"

[Run]
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""AirQuiz"""; Flags: runhidden
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""AirQuiz"" dir=in action=allow program=""{app}\AirQuiz.exe"" enable=yes profile=private,public"; Flags: runhidden
Filename: "{app}\AirQuiz.exe"; Description: "Start AirQuiz now"; Flags: nowait postinstall skipifsilent

[UninstallRun]
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""AirQuiz"""; Flags: runhidden
