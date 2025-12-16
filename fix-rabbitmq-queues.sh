#!/bin/bash

# Fix RabbitMQ Queue Configuration
# This script deletes and recreates M-Pesa and TigoPesa queues with correct settings

echo "==================================="
echo "RabbitMQ Queue Fix Script"
echo "==================================="
echo ""

# RabbitMQ connection details (update these if needed)
RABBITMQ_HOST="${RABBITMQ_HOST:-localhost}"
RABBITMQ_PORT="${RABBITMQ_PORT:-15672}"
RABBITMQ_USER="${RABBITMQ_USER:-guest}"
RABBITMQ_PASS="${RABBITMQ_PASS:-guest}"
RABBITMQ_VHOST="${RABBITMQ_VHOST:-/}"

echo "RabbitMQ Host: $RABBITMQ_HOST:$RABBITMQ_PORT"
echo "RabbitMQ User: $RABBITMQ_USER"
echo "RabbitMQ VHost: $RABBITMQ_VHOST"
echo ""

# Function to delete a queue
delete_queue() {
    local queue_name=$1
    echo "Deleting queue: $queue_name"

    curl -i -u "$RABBITMQ_USER:$RABBITMQ_PASS" \
        -H "content-type:application/json" \
        -X DELETE \
        "http://$RABBITMQ_HOST:$RABBITMQ_PORT/api/queues/$RABBITMQ_VHOST/$queue_name"

    echo ""
}

# Delete M-Pesa queues
echo "Step 1: Deleting M-Pesa queues..."
delete_queue "ucg.mpesa.payment.processing"
delete_queue "ucg.mpesa.callback"

# Delete TigoPesa queues
echo "Step 2: Deleting TigoPesa queues..."
delete_queue "ucg.tigopesa.payment.processing"

echo ""
echo "==================================="
echo "✅ Queues deleted successfully!"
echo "==================================="
echo ""
echo "Next steps:"
echo "1. Restart your NestJS application"
echo "2. The queues will be recreated automatically with correct settings"
echo "3. Verify in RabbitMQ Management UI: http://$RABBITMQ_HOST:$RABBITMQ_PORT"
echo ""
