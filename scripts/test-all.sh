#!/usr/bin/env bash
set -euo pipefail

npm install
npm run test
npm run build

DOTNET_CMD=""
if command -v dotnet >/dev/null 2>&1; then
  DOTNET_CMD="dotnet"
elif command -v dotnet.exe >/dev/null 2>&1; then
  DOTNET_CMD="dotnet.exe"
elif [[ -x "/mnt/c/Program Files/dotnet/dotnet.exe" ]]; then
  DOTNET_CMD="/mnt/c/Program Files/dotnet/dotnet.exe"
else
  echo "dotnet is required for MVC tests but was not found in PATH." >&2
  exit 1
fi

"${DOTNET_CMD}" test ./tests/Muonroi.Ui.Engine.Mvc.Tests/Muonroi.Ui.Engine.Mvc.Tests.csproj -c Release
