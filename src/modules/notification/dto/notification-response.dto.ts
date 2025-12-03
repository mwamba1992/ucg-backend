export class NotificationResponseDto {
  statusDescription: string;
  statusCode: string;
}

export interface NotificationResult {
  success: boolean;
  statusCode?: string;
  statusDescription?: string;
  error?: string;
}
