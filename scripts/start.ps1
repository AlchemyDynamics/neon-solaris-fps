$ErrorActionPreference = "Stop"

$BundledNode = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
$Server = Join-Path $PSScriptRoot "serve.mjs"

if (Test-Path $BundledNode) {
  & $BundledNode $Server
  exit $LASTEXITCODE
}

& node $Server
exit $LASTEXITCODE
