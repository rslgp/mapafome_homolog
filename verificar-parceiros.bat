@echo off
REM ============================================================================
REM verificar-parceiros.bat — reproduz manualmente o teste dos planos de /parceiros
REM
REM Roda a spec tests/e2e/parceiros-planos.e2e.js com o browser VISIVEL (headed),
REM so no projeto chromium-desktop, para voce ASSISTIR cada plano ser selecionado.
REM A spec seleciona os 5 tiers (bairro, cidade, estadual, nacional, contrapartida),
REM confere que o card fica --selected, que o <select> do form sincroniza e que o
REM mailto: carrega o tier, e salva 1 PNG full-page por plano em:
REM     test-results\parceiros-planos\
REM verificando cada PNG (header PNG valido + tamanho > 3KB).
REM No fim abre a pasta dos PNGs e o relatorio HTML para voce conferir a olho.
REM
REM Pre-requisito: o app precisa estar servido em http://localhost:3000.
REM   - Se voce JA tem `npm run dev` rodando, a config reusa (reuseExistingServer).
REM   - Se NAO tiver, o Playwright sobe `npm run dev` sozinho (pode demorar no 1o hit).
REM
REM Uso:
REM     verificar-parceiros.bat            (roda tudo, headed)
REM     verificar-parceiros.bat --debug    (abre o Playwright Inspector, passo a passo)
REM ============================================================================

setlocal
cd /d "%~dp0"

set "SHOTDIR=%~dp0test-results\parceiros-planos"
set "PWFLAGS=--project=chromium-desktop --headed"

REM Modo passo-a-passo opcional: verificar-parceiros.bat --debug
if /I "%~1"=="--debug" (
  set "PWFLAGS=%PWFLAGS% --debug"
  echo [parceiros] modo DEBUG: o Playwright Inspector vai pausar em cada acao.
)

echo.
echo === Rodando a verificacao dos planos de /parceiros (browser visivel) ===
echo     Spec:  tests\e2e\parceiros-planos.e2e.js
echo     PNGs:  %SHOTDIR%
echo.

call npx playwright test parceiros-planos.e2e.js %PWFLAGS%
set "RC=%ERRORLEVEL%"

echo.
if "%RC%"=="0" (
  echo === PASSOU. 5 planos selecionados + mailto verificado + PNGs gerados. ===
) else (
  echo === FALHOU (codigo %RC%). Veja o relatorio HTML e os PNGs abaixo. ===
)

REM Abre a pasta dos screenshots para conferencia visual.
if exist "%SHOTDIR%" (
  echo Abrindo a pasta dos PNGs...
  start "" "%SHOTDIR%"
)

REM Abre o relatorio HTML do Playwright (traces/erros por teste).
echo Abrindo o relatorio HTML do Playwright...
call npx playwright show-report

endlocal
exit /b %RC%
