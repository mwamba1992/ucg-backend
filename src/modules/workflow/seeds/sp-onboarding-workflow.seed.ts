import { WorkflowDefinitionJson } from '../entities/workflow-definition.entity';

/**
 * Service Provider Onboarding Workflow Definition
 *
 * This workflow manages the complete onboarding process for new service providers
 * from initial submission through KYC verification to final approval.
 */
export const SP_ONBOARDING_WORKFLOW: WorkflowDefinitionJson = {
  name: 'Service Provider Onboarding',
  description: 'Complete workflow for onboarding new service providers with KYC verification and multi-level approval',
  steps: [
    {
      id: 'document_submission',
      name: 'Document Submission',
      type: 'AUTO_TASK',
      nextSteps: ['document_verification'],
      actions: ['SUBMIT'],
      metadata: {
        description: 'Service provider submits registration documents',
      },
    },
    {
      id: 'document_verification',
      name: 'Document Verification',
      type: 'MANUAL_TASK',
      assignTo: 'ROLE:KYC_OFFICER',
      sla: 24, // 24 hours
      requiredFields: ['registrationNumber', 'tinNumber', 'businessName'],
      nextSteps: ['kyc_verification'],
      actions: ['APPROVE', 'REJECT', 'REQUEST_INFO'],
      metadata: {
        description: 'KYC Officer verifies submitted documents',
        checklist: [
          'Business registration certificate verified',
          'TIN certificate verified',
          'Contact person ID verified',
          'Bank account details verified',
        ],
      },
    },
    {
      id: 'kyc_verification',
      name: 'KYC Verification',
      type: 'PARALLEL_TASKS',
      sla: 4, // 4 hours
      nextSteps: ['risk_assessment'],
      actions: ['AUTO_COMPLETE'],
      tasks: [
        {
          id: 'nida_check',
          name: 'NIDA Verification',
          type: 'API_CALL',
          api: 'https://ors.nida.go.tz/api/v1/verify',
          metadata: {
            description: 'Verify contact person identity with NIDA',
          },
        },
        {
          id: 'brela_check',
          name: 'BRELA Verification',
          type: 'API_CALL',
          api: 'https://api.brela.go.tz/v1/business/verify',
          metadata: {
            description: 'Verify business registration with BRELA',
          },
        },
        {
          id: 'tra_check',
          name: 'TRA TIN Verification',
          type: 'API_CALL',
          api: 'https://api.tra.go.tz/verification/v1/tin/verify',
          metadata: {
            description: 'Verify TIN with TRA',
          },
        },
      ],
      metadata: {
        description: 'Automated KYC checks with government agencies',
      },
    },
    {
      id: 'risk_assessment',
      name: 'Risk Assessment',
      type: 'MANUAL_TASK',
      assignTo: 'ROLE:RISK_OFFICER',
      sla: 48, // 48 hours
      nextSteps: ['compliance_review'],
      actions: ['LOW_RISK', 'MEDIUM_RISK', 'HIGH_RISK', 'REJECT'],
      metadata: {
        description: 'Risk Officer assesses service provider risk profile',
        criteria: [
          'Business type and sector',
          'Expected transaction volume',
          'Geographical location',
          'Ownership structure',
          'KYC verification results',
        ],
      },
    },
    {
      id: 'compliance_review',
      name: 'Compliance Review',
      type: 'MANUAL_TASK',
      assignTo: 'ROLE:COMPLIANCE_OFFICER',
      sla: 24, // 24 hours
      nextSteps: ['manager_approval'],
      actions: ['APPROVE', 'REJECT', 'REQUEST_ADDITIONAL_INFO'],
      metadata: {
        description: 'Compliance Officer reviews for regulatory compliance',
        checks: [
          'AML/CFT compliance',
          'Regulatory licenses verified',
          'Sanctions screening passed',
          'Risk rating acceptable',
        ],
      },
    },
    {
      id: 'manager_approval',
      name: 'Manager Final Approval',
      type: 'MANUAL_TASK',
      assignTo: 'ROLE:OPERATIONS_MANAGER',
      sla: 24, // 24 hours
      nextSteps: ['setup_complete'],
      actions: ['APPROVE', 'REJECT'],
      metadata: {
        description: 'Operations Manager provides final approval',
      },
    },
    {
      id: 'setup_complete',
      name: 'Setup Complete',
      type: 'AUTO_TASK',
      nextSteps: [],
      actions: ['COMPLETE'],
      metadata: {
        description: 'Onboarding complete - service provider activated',
        automatedActions: [
          'Generate API credentials',
          'Send welcome email',
          'Activate service provider',
          'Notify relevant teams',
        ],
      },
    },
  ],
};

/**
 * Insert this workflow definition into the database:
 *
 * INSERT INTO workflow_definitions (name, entity_type, version, is_active, definition, description)
 * VALUES (
 *   'Service Provider Onboarding',
 *   'SERVICE_PROVIDER',
 *   1,
 *   true,
 *   '<SP_ONBOARDING_WORKFLOW_JSON>',
 *   'Complete workflow for onboarding new service providers with KYC verification'
 * );
 */
