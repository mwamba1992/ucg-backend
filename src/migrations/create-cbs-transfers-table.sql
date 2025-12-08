-- Migration: Create CBS Transfers Table
-- Date: 2025-12-03
-- Description: Add table to track CBS fund transfers

CREATE TABLE IF NOT EXISTS cbs_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID,
    reference VARCHAR(50) NOT NULL,
    credit_account VARCHAR(50) NOT NULL,
    debit_account VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    cbs_response_code TEXT,
    cbs_response_message TEXT,
    cbs_response JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to payments table
ALTER TABLE cbs_transfers
ADD CONSTRAINT fk_cbs_transfers_payment
FOREIGN KEY (payment_id)
REFERENCES payments(id)
ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cbs_transfers_reference ON cbs_transfers(reference);
CREATE INDEX IF NOT EXISTS idx_cbs_transfers_payment_id ON cbs_transfers(payment_id);
CREATE INDEX IF NOT EXISTS idx_cbs_transfers_status ON cbs_transfers(status);
CREATE INDEX IF NOT EXISTS idx_cbs_transfers_created_at ON cbs_transfers(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cbs_transfers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cbs_transfers_updated_at
BEFORE UPDATE ON cbs_transfers
FOR EACH ROW
EXECUTE FUNCTION update_cbs_transfers_updated_at();

-- Add comments
COMMENT ON TABLE cbs_transfers IS 'Tracks all CBS (Core Banking System) fund transfers';
COMMENT ON COLUMN cbs_transfers.payment_id IS 'Reference to the payment that triggered this transfer';
COMMENT ON COLUMN cbs_transfers.reference IS 'Payment reference number';
COMMENT ON COLUMN cbs_transfers.credit_account IS 'Account to receive funds (usually SP account)';
COMMENT ON COLUMN cbs_transfers.debit_account IS 'Account to send funds from (usually UCG GL account)';
COMMENT ON COLUMN cbs_transfers.type IS 'Transfer type: GL_TO_DEPOSIT, DEPOSIT_TO_GL, etc.';
COMMENT ON COLUMN cbs_transfers.status IS 'Transfer status: PENDING, SUCCESS, FAILED, REVERSED';
COMMENT ON COLUMN cbs_transfers.cbs_response IS 'Full JSON response from CBS API';
COMMENT ON COLUMN cbs_transfers.retry_count IS 'Number of retry attempts for failed transfers';
