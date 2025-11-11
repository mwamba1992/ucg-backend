#!/bin/bash

# Delete all UCG queues to fix PRECONDITION_FAILED error

echo "Deleting existing UCG queues..."

# Try Docker first
if docker ps | grep -q rabbitmq; then
  echo "Found RabbitMQ in Docker"
  docker exec rabbitmq rabbitmqctl delete_queue ucg.reference.generation 2>/dev/null && echo "✅ Deleted ucg.reference.generation"
  docker exec rabbitmq rabbitmqctl delete_queue ucg.reference.bulk 2>/dev/null && echo "✅ Deleted ucg.reference.bulk"
  docker exec rabbitmq rabbitmqctl delete_queue ucg.reference.validation 2>/dev/null && echo "✅ Deleted ucg.reference.validation"
  docker exec rabbitmq rabbitmqctl delete_queue ucg.payment.processing 2>/dev/null && echo "✅ Deleted ucg.payment.processing"
  docker exec rabbitmq rabbitmqctl delete_queue ucg.payment.notification 2>/dev/null && echo "✅ Deleted ucg.payment.notification"
else
  # Try local RabbitMQ
  echo "Using local RabbitMQ"
  rabbitmqctl delete_queue ucg.reference.generation 2>/dev/null && echo "✅ Deleted ucg.reference.generation"
  rabbitmqctl delete_queue ucg.reference.bulk 2>/dev/null && echo "✅ Deleted ucg.reference.bulk"
  rabbitmqctl delete_queue ucg.reference.validation 2>/dev/null && echo "✅ Deleted ucg.reference.validation"
  rabbitmqctl delete_queue ucg.payment.processing 2>/dev/null && echo "✅ Deleted ucg.payment.processing"
  rabbitmqctl delete_queue ucg.payment.notification 2>/dev/null && echo "✅ Deleted ucg.payment.notification"
fi

echo ""
echo "✅ All queues deleted!"
echo "Now restart your application: npm run start:dev"
