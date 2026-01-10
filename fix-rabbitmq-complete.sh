#!/bin/bash

# Complete RabbitMQ Fix for M-Pesa and TigoPesa Queues
# Run this on the UAT server

set -e  # Exit on error

echo "=========================================="
echo "RabbitMQ Complete Fix Script"
echo "=========================================="
echo ""

# RabbitMQ connection details
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-15672}"
RABBITMQ_USER="${RABBITMQ_USER:-admin}"
RABBITMQ_PASS="${RABBITMQ_PASS:-admin123}"

echo "RabbitMQ Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "RabbitMQ User: $RABBITMQ_USER"
echo ""

# Step 1: Stop the application
echo "Step 1: Stopping application..."
pm2 stop ucg-backend || true
sleep 2

# Step 2: Delete ALL UCG queues
echo ""
echo "Step 2: Deleting all UCG queues..."

QUEUES=(
    "ucg.mpesa.payment.processing"
    "ucg.mpesa.callback"
    "ucg.tigopesa.payment.processing"
    "ucg.payment.processing"
    "ucg.reference.generation"
    "ucg.reference.notification"
    "ucg.reference.notification.dlq"
)

for queue in "${QUEUES[@]}"; do
    echo "  Deleting: $queue"
    curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -X DELETE \
        "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/%2F/$queue" \
        > /dev/null 2>&1 || echo "    (queue may not exist)"
done

# Step 3: Restart RabbitMQ to clear all connections
echo ""
echo "Step 3: Restarting RabbitMQ..."
sudo systemctl restart rabbitmq-server || docker restart rabbitmq || true
echo "  Waiting for RabbitMQ to be ready..."
sleep 10

# Step 4: Verify queues are deleted
echo ""
echo "Step 4: Verifying queues are deleted..."
QUEUE_COUNT=$(curl -s -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
    "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues" | \
    grep -c '"name":"ucg\.' || echo "0")
echo "  UCG queues remaining: $QUEUE_COUNT"

# Step 5: Start the application
echo ""
echo "Step 5: Starting application..."
cd /opt/uat/ucg-backend || cd ~/ucg-backend || exit 1
pm2 start ecosystem.config.js || pm2 start dist/main.js --name ucg-backend

# Step 6: Wait and check logs
echo ""
echo "Step 6: Checking application startup..."
sleep 5
pm2 logs ucg-backend --lines 20 --nostream

echo ""
echo "=========================================="
echo "✅ Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Check logs: pm2 logs ucg-backend"
echo "2. Verify no 406 errors"
echo "3. Check RabbitMQ UI: http://$RABBITMQ_HOST:$RABBITMQ_PORT"
echo ""
