@echo off
setlocal

rem Usage:
rem   set ETMS_DOC_ROOT=D:\project\etms\doc
rem   set ETMS_BUG_OWNER=28
rem   update_bug.bat
rem or:
rem   update_bug.bat D:\project\etms\doc

if not "%~1"=="" set "ETMS_DOC_ROOT=%~1"
if "%ETMS_DOC_ROOT%"=="" set "ETMS_DOC_ROOT=D:\project\etms\doc"

if not exist "%ETMS_DOC_ROOT%" (
  echo ETMS_DOC_ROOT does not exist: %ETMS_DOC_ROOT%
  exit /b 1
)

cd /d "%ETMS_DOC_ROOT%" || exit /b 1

if exist "update_bug_data.js" (
  call node update_bug_data.js
) else (
  call node "%~dp0update_bug_data.template.js"
)
