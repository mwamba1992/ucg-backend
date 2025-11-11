#!/bin/bash

echo "=== Setting up Dead Letter Exchange and Queue ==="

if command -v docker &> /dev/null; then
    echo "Using Docker RabbitMQ..."
    RABBITMQ_CMD="docker exec rabbitmq rabbitmqadmin"
else
    echo "Using local RabbitMQ..."
    RABBITMQ_CMD="rabbitmqadmin"
fi

# Declare Dead Letter Exchange
echo "1. Creating Dead Letter Exchange (ucg.dlx)..."
$RABBITMQ_CMD declare exchange name=ucg.dlx type=topic durable=true

# Declare Dead Letter Queue
echo "2. Creating Dead Letter Queue (ucg.reference.notification.dlq)..."
$RABBITMQ_CMD declare queue name=ucg.reference.notification.dlq durable=true

# Bind DLQ to DLX
echo "3. Binding DLQ to DLX..."
$RABBITMQ_CMD declare binding source=ucg.dlx destination=ucg.reference.notification.dlq routing_key=reference.notification.failed

echo ""
echo "✅ Dead Letter Exchange setup complete!"
echo ""
echo "Failed messages will be stored in: ucg.reference.notification.dlq"
echo "You can inspect them with: rabbitmqadmin get queue=ucg.reference.notification.dlq"
echo "You can retry them using the /admin/retry-failed-callbacks endpoint"

