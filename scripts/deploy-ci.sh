#!/usr/bin/env bash
set -euo pipefail

: "${AWS_REGION:?}"
: "${EC2_INSTANCE_ID:?}"
: "${DEPLOY_BUCKET:?}"
: "${GITHUB_SHA:?}"

artifact="deployments/${GITHUB_SHA}/source.tar.gz"
archive="${RUNNER_TEMP:-/tmp}/astrojobs-${GITHUB_SHA}.tar.gz"

cleanup() {
  rm -f "${archive}"
  aws s3 rm "s3://${DEPLOY_BUCKET}/${artifact}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

tar -czf "${archive}" \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='.venv' \
  --exclude='dist' \
  --exclude='__pycache__' \
  .

aws s3 cp "${archive}" "s3://${DEPLOY_BUCKET}/${artifact}"

parameters=$(jq -cn \
  --arg source "s3://${DEPLOY_BUCKET}/${artifact}" \
  '{commands: [
    "set -euo pipefail",
    "test -s /home/ubuntu/astrojobs/.env",
    "aws s3 cp " + $source + " /tmp/astrojobs.tar.gz",
    "tar -xzf /tmp/astrojobs.tar.gz -C /home/ubuntu/astrojobs",
    "chown -R ubuntu:ubuntu /home/ubuntu/astrojobs",
    "bash /home/ubuntu/astrojobs/scripts/deploy-host.sh",
    "rm -f /tmp/astrojobs.tar.gz"
  ]}')

command_id=$(aws ssm send-command \
  --region "${AWS_REGION}" \
  --instance-ids "${EC2_INSTANCE_ID}" \
  --document-name AWS-RunShellScript \
  --comment "Deploy AstroJobs ${GITHUB_SHA}" \
  --timeout-seconds 1200 \
  --parameters "${parameters}" \
  --query 'Command.CommandId' \
  --output text)

echo "SSM command: ${command_id}"
status=Pending
for _ in $(seq 1 120); do
  sleep 5
  status=$(aws ssm get-command-invocation \
    --region "${AWS_REGION}" \
    --command-id "${command_id}" \
    --instance-id "${EC2_INSTANCE_ID}" \
    --query Status \
    --output text 2>/dev/null || echo Pending)
  case "${status}" in
    Success|Failed|Cancelled|TimedOut) break ;;
  esac
done

aws ssm get-command-invocation \
  --region "${AWS_REGION}" \
  --command-id "${command_id}" \
  --instance-id "${EC2_INSTANCE_ID}" \
  --query '{Status:Status,Output:StandardOutputContent,Error:StandardErrorContent}' \
  --output text

test "${status}" = Success
