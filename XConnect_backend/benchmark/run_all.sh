#!/bin/bash
# ============================================================
# XConnect — Run All Benchmarks
# ============================================================
# Chạy: bash benchmark/run_all.sh
# Với custom URL: BASE_URL=http://192.168.1.100:8080 bash benchmark/run_all.sh
# ============================================================

BASE_URL="${BASE_URL:-http://host.docker.internal:8080}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_DIR="benchmark/results/${TIMESTAMP}"

mkdir -p "$RESULTS_DIR"

echo "🚀 XConnect Benchmark Suite"
echo "   Target: ${BASE_URL}"
echo "   Results: ${RESULTS_DIR}"
echo "============================================"

# Hàm chạy 1 test với Docker
run_test() {
  local name="$1"
  local file="$2"
  local extra_args="${3:-}"

  echo ""
  echo "▶  Running: ${name}"
  echo "   File: ${file}"
  echo "--------------------------------------------"

  docker run --rm -i \
    --add-host=host.docker.internal:host-gateway \
    -e BASE_URL="${BASE_URL}" \
    -v "$(pwd)/benchmark/k6:/scripts" \
    grafana/k6 run \
    --out json="/scripts/../results/${TIMESTAMP}/${name}.json" \
    $extra_args \
    "/scripts/$(basename $file)" \
    2>&1 | tee "${RESULTS_DIR}/${name}.log"

  local exit_code=$?
  if [ $exit_code -eq 0 ]; then
    echo "✅ ${name}: PASSED"
  else
    echo "❌ ${name}: FAILED (exit code: ${exit_code})"
  fi
  echo "--------------------------------------------"

  return $exit_code
}

# ─── Run tests ───────────────────────────────────────────────
run_test "01_auth"           "benchmark/k6/01_auth.js"
run_test "02_chat_api"       "benchmark/k6/02_chat_api.js"
run_test "03_websocket"      "benchmark/k6/03_websocket.js"
run_test "05_token_security" "benchmark/k6/05_token_security.js"

echo ""
echo "⚠️  Stress test (04) phải chạy riêng vì tải rất lớn:"
echo "   bash benchmark/run_stress.sh"
echo ""
echo "============================================"
echo "📊 All results saved to: ${RESULTS_DIR}/"
echo "   View JSON results or check .log files"
