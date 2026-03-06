#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Generate API clients for UI stacks from OpenAPI.

Usage:
  ./scripts/generate-ui-clients.sh \
    --openapi <openapi-file-or-url> \
    [--framework angular|react|mvc|all] \
    [--output <output-dir>]
EOF
}

OPENAPI_SOURCE=""
FRAMEWORK="all"
OUTPUT_DIR="./_tmp/generated-api-clients"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --openapi)
      OPENAPI_SOURCE="${2:-}"
      shift 2
      ;;
    --framework)
      FRAMEWORK="${2:-}"
      shift 2
      ;;
    --output)
      OUTPUT_DIR="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "${OPENAPI_SOURCE}" ]]; then
  echo "--openapi is required." >&2
  exit 1
fi

case "${FRAMEWORK}" in
  angular|react|mvc|all) ;;
  *)
    echo "Invalid --framework: ${FRAMEWORK}" >&2
    exit 1
    ;;
esac

mkdir -p "${OUTPUT_DIR}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

SPEC_FILE="${OPENAPI_SOURCE}"
if [[ "${OPENAPI_SOURCE}" =~ ^https?:// ]]; then
  SPEC_FILE="${TMP_DIR}/openapi.json"
  curl -fsSL "${OPENAPI_SOURCE}" -o "${SPEC_FILE}"
fi

if [[ ! -f "${SPEC_FILE}" ]]; then
  echo "OpenAPI source not found: ${SPEC_FILE}" >&2
  exit 1
fi

run_openapi_generator() {
  local generator="$1"
  local outdir="$2"
  local extra="$3"

  mkdir -p "${outdir}"

  if command -v openapi-generator-cli >/dev/null 2>&1; then
    openapi-generator-cli generate -g "${generator}" -i "${SPEC_FILE}" -o "${outdir}" ${extra}
    return
  fi

  if command -v npx >/dev/null 2>&1; then
    npx --yes @openapitools/openapi-generator-cli generate -g "${generator}" -i "${SPEC_FILE}" -o "${outdir}" ${extra}
    return
  fi

  if command -v docker >/dev/null 2>&1; then
    local abs_spec="${SPEC_FILE}"
    case "${abs_spec}" in
      /*) ;;
      *) abs_spec="$(pwd)/${abs_spec}" ;;
    esac

    local local_spec="${abs_spec#$(pwd)/}"
    local local_out="${outdir#$(pwd)/}"

    if [[ "${local_spec}" == "${abs_spec}" ]]; then
      cp "${SPEC_FILE}" "${TMP_DIR}/openapi-docker.json"
      local_spec="${TMP_DIR#$(pwd)/}/openapi-docker.json"
    fi

    if [[ "${local_out}" == /* ]]; then
      echo "When Docker fallback is used, --output must be inside repository." >&2
      exit 1
    fi

    docker run --rm -v "$(pwd):/local" openapitools/openapi-generator-cli:v7.9.0 generate \
      -g "${generator}" \
      -i "/local/${local_spec#./}" \
      -o "/local/${local_out#./}" \
      ${extra}
    return
  fi

  echo "openapi-generator-cli or Docker is required." >&2
  exit 1
}

if [[ "${FRAMEWORK}" == "angular" || "${FRAMEWORK}" == "all" ]]; then
  run_openapi_generator "typescript-angular" "${OUTPUT_DIR}/angular" "--additional-properties=ngVersion=18.0.0,npmName=@muonroi/generated-api-angular,npmVersion=0.1.0,withInterfaces=true"
fi

if [[ "${FRAMEWORK}" == "react" || "${FRAMEWORK}" == "all" ]]; then
  run_openapi_generator "typescript-fetch" "${OUTPUT_DIR}/react" "--additional-properties=npmName=@muonroi/generated-api-react,npmVersion=0.1.0,modelPropertyNaming=camelCase"
fi

if [[ "${FRAMEWORK}" == "mvc" || "${FRAMEWORK}" == "all" ]]; then
  run_openapi_generator "csharp" "${OUTPUT_DIR}/mvc" "--additional-properties=packageName=Muonroi.Generated.Api.Mvc,targetFramework=net9.0,nullableReferenceTypes=true"
fi

echo "Generated API clients at: ${OUTPUT_DIR}"
