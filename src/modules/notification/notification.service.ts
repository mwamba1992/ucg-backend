import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  SendNotificationDto,
  NotificationType,
} from './dto/send-notification.dto';
import {
  NotificationResponseDto,
  NotificationResult,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly notificationServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.notificationServiceUrl = this.configService.get<string>(
      'NOTIFICATION_SERVICE_URL',
    );
  }

  /**
   * Send a notification via the notification service
   */
  async sendNotification(
    dto: SendNotificationDto,
  ): Promise<NotificationResult> {
    try {
      if (!this.notificationServiceUrl) {
        this.logger.warn('Notification service URL not configured');
        return {
          success: false,
          error: 'Notification service not configured',
        };
      }

      this.logger.log(
        `Sending ${dto.type} notification to ${dto.recepient} - Subject: ${dto.subject}`,
      );

      const response = await firstValueFrom(
        this.httpService.post<NotificationResponseDto>(
          `${this.notificationServiceUrl}/send`,
          dto,
        ),
      );

      if (response.data.statusCode === '6200') {
        this.logger.log(
          `Notification sent successfully: ${response.data.statusDescription}`,
        );
        return {
          success: true,
          statusCode: response.data.statusCode,
          statusDescription: response.data.statusDescription,
        };
      } else {
        this.logger.warn(
          `Unexpected status code: ${response.data.statusCode} - ${response.data.statusDescription}`,
        );
        return {
          success: false,
          statusCode: response.data.statusCode,
          statusDescription: response.data.statusDescription,
        };
      }
    } catch (error) {
      this.logger.error(
        `Failed to send ${dto.type} notification: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(
    phoneNumber: string,
    message: string,
    subject: string,
  ): Promise<NotificationResult> {
    return this.sendNotification({
      message,
      recepient: phoneNumber,
      type: NotificationType.SMS,
      subject,
    });
  }

  /**
   * Send Email notification
   */
  async sendEmail(
    email: string,
    message: string,
    subject: string,
    sender: string = 'UCG',
  ): Promise<NotificationResult> {
    return this.sendNotification({
      message,
      recepient: email,
      type: NotificationType.EMAIL,
      subject,
      sender,
    });
  }

  /**
   * Send both SMS and Email notifications
   */
  async sendBoth(
    phoneNumber: string,
    email: string,
    message: string,
    subject: string,
    sender: string = 'UCG',
  ): Promise<{ sms: NotificationResult; email: NotificationResult }> {
    const [sms, emailResult] = await Promise.all([
      this.sendSMS(phoneNumber, message, subject),
      this.sendEmail(email, message, subject, sender),
    ]);

    return { sms, email: emailResult };
  }

  /**
   * Send Service Provider onboarding notification
   */
  async notifyServiceProviderRegistration(
    email: string,
    phoneNumber: string,
    businessName: string,
    spCode: string,
  ): Promise<void> {
    const subject = 'Service Provider Registration Successful';
    const message = `Dear ${businessName},\n\nYour registration with UCG has been received successfully. Your Service Provider Code is: ${spCode}.\n\nYour application is currently under review. You will be notified once the review is complete.\n\nThank you for choosing UCG.`;

    await this.sendBoth(phoneNumber, email, message, subject, 'UCG');
  }

  /**
   * Send Service Provider approval notification
   */
  async notifyServiceProviderApproval(
    email: string,
    phoneNumber: string,
    businessName: string,
    apiKey: string,
  ): Promise<void> {
    const subject = 'Service Provider Application Approved';
    const message = `Dear ${businessName},\n\nCongratulations! Your application has been approved.\n\nYour API Key: ${apiKey}\n\nYou can now start generating payment references and receiving payments through UCG.\n\nPlease keep your API key secure and do not share it with unauthorized parties.\n\nBest regards,\nUCG Team`;

    await this.sendBoth(phoneNumber, email, message, subject, 'UCG');
  }

  /**
   * Send Service Provider rejection notification
   */
  async notifyServiceProviderRejection(
    email: string,
    phoneNumber: string,
    businessName: string,
    reason: string,
  ): Promise<void> {
    const subject = 'Service Provider Application Rejected';
    const message = `Dear ${businessName},\n\nWe regret to inform you that your application has been rejected.\n\nReason: ${reason}\n\nYou may reapply after addressing the issues mentioned above.\n\nFor more information, please contact our support team.\n\nBest regards,\nUCG Team`;

    await this.sendBoth(phoneNumber, email, message, subject, 'UCG');
  }

  /**
   * Send payment received notification
   */
  async notifyPaymentReceived(
    email: string,
    phoneNumber: string,
    referenceNumber: string,
    amount: number,
    customerName: string,
    businessName: string,
  ): Promise<void> {
    const subject = 'Payment Received';
    const message = `Dear ${businessName},\n\nPayment received successfully!\n\nReference: ${referenceNumber}\nCustomer: ${customerName}\nAmount: TZS ${amount.toLocaleString()}\n\nThe payment will be settled according to your settlement schedule.\n\nThank you for using UCG.`;

    await this.sendBoth(phoneNumber, email, message, subject, 'UCG');
  }

  /**
   * Send payment notification to customer
   */
  async notifyCustomerPaymentSuccess(
    phoneNumber: string,
    customerName: string,
    referenceNumber: string,
    amount: number,
    businessName: string,
  ): Promise<void> {
    const subject = 'Payment Successful';
    const message = `Dear ${customerName},\n\nYour payment has been received successfully.\n\nReference: ${referenceNumber}\nAmount: TZS ${amount.toLocaleString()}\nPaid to: ${businessName}\n\nThank you for your payment.`;

    await this.sendSMS(phoneNumber, message, subject);
  }

  /**
   * Send payment reference created notification
   */
  async notifyReferenceCreated(
    email: string,
    phoneNumber: string,
    customerName: string,
    referenceNumber: string,
    amount: number,
    description: string,
    businessName: string,
  ): Promise<void> {
    const subject = 'Payment Reference Created';
    const message = `Dear ${customerName},\n\nA payment reference has been created for you.\n\nReference Number: ${referenceNumber}\nAmount: TZS ${amount.toLocaleString()}\nDescription: ${description}\nService Provider: ${businessName}\n\nPlease use this reference number when making your payment.\n\nThank you.`;

    // Send SMS to customer
    await this.sendSMS(phoneNumber, message, subject);
  }

  /**
   * Send batch reference completion notification
   */
  async notifyBatchReferenceComplete(
    email: string,
    phoneNumber: string,
    businessName: string,
    batchId: string,
    totalRequested: number,
    successCount: number,
    failureCount: number,
  ): Promise<void> {
    const subject = 'Batch Reference Generation Complete';
    const message = `Dear ${businessName},\n\nYour batch reference generation has been completed.\n\nBatch ID: ${batchId}\nTotal Requested: ${totalRequested}\nSuccessful: ${successCount}\nFailed: ${failureCount}\n\nYou can download the results from your dashboard.\n\nBest regards,\nUCG Team`;

    await this.sendBoth(phoneNumber, email, message, subject, 'UCG');
  }

  /**
   * Send user registration notification
   */
  async notifyUserRegistration(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const subject = 'Welcome to UCG';
    const message = `Dear ${firstName} ${lastName},\n\nWelcome to the Unified Collection Gateway!\n\nYour account has been created successfully. Your account is pending approval by an administrator.\n\nYou will receive a notification once your account is activated.\n\nBest regards,\nUCG Team`;

    await this.sendEmail(email, message, subject, 'UCG');
  }

  /**
   * Send user activation notification
   */
  async notifyUserActivation(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const subject = 'Account Activated';
    const message = `Dear ${firstName} ${lastName},\n\nYour UCG account has been activated!\n\nYou can now log in and access the system.\n\nBest regards,\nUCG Team`;

    await this.sendEmail(email, message, subject, 'UCG');
  }

  /**
   * Send password change notification
   */
  async notifyPasswordChange(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    const subject = 'Password Changed Successfully';
    const message = `Dear ${firstName} ${lastName},\n\nYour password has been changed successfully.\n\nIf you did not make this change, please contact our support team immediately.\n\nBest regards,\nUCG Team`;

    await this.sendEmail(email, message, subject, 'UCG');
  }

  /**
   * Send payment reference expiry reminder
   */
  async notifyReferenceExpiringSoon(
    phoneNumber: string,
    customerName: string,
    referenceNumber: string,
    amount: number,
    expiryDate: Date,
  ): Promise<void> {
    const subject = 'Payment Reference Expiring Soon';
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    const message = `Dear ${customerName},\n\nReminder: Your payment reference ${referenceNumber} will expire in ${daysRemaining} day(s).\n\nAmount Due: TZS ${amount.toLocaleString()}\nExpiry Date: ${expiryDate.toLocaleDateString()}\n\nPlease make your payment before the expiry date.\n\nThank you.`;

    await this.sendSMS(phoneNumber, message, subject);
  }

  /**
   * Send settlement notification to Service Provider
   */
  async notifySettlement(
    email: string,
    phoneNumber: string,
    businessName: string,
    amount: number,
    transactionCount: number,
    settlementDate: Date,
  ): Promise<void> {
    const subject = 'Settlement Processed';
    const message = `Dear ${businessName},\n\nYour settlement has been processed successfully.\n\nAmount: TZS ${amount.toLocaleString()}\nTransactions: ${transactionCount}\nSettlement Date: ${settlementDate.toLocaleDateString()}\n\nThe funds will be credited to your account shortly.\n\nBest regards,\nUCG Team`;

    await this.sendBoth(phoneNumber, email, message, subject, 'UCG');
  }

  /**
   * Send workflow task assignment notification
   */
  async notifyWorkflowTaskAssigned(
    email: string,
    assigneeName: string,
    taskTitle: string,
    taskDescription: string,
    dueDate?: Date,
  ): Promise<void> {
    const subject = 'New Task Assigned';
    const dueDateText = dueDate
      ? `\nDue Date: ${dueDate.toLocaleDateString()}`
      : '';
    const message = `Dear ${assigneeName},\n\nA new task has been assigned to you.\n\nTask: ${taskTitle}\nDescription: ${taskDescription}${dueDateText}\n\nPlease log in to the system to view and complete the task.\n\nBest regards,\nUCG Team`;

    await this.sendEmail(email, message, subject, 'WORKFLOW');
  }

  /**
   * Send workflow approval notification
   */
  async notifyWorkflowApproval(
    email: string,
    phoneNumber: string,
    recipientName: string,
    workflowType: string,
    status: string,
  ): Promise<void> {
    const subject = `Workflow ${status}`;
    const message = `Dear ${recipientName},\n\nYour ${workflowType} workflow has been ${status.toLowerCase()}.\n\nPlease log in to the system for more details.\n\nBest regards,\nUCG Team`;

    await this.sendBoth(phoneNumber, email, message, subject, 'WORKFLOW');
  }
}
