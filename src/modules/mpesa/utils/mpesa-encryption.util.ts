import * as crypto from 'crypto';

/**
 * M-Pesa Password Encryption Utility
 *
 * Implements M-Pesa password hashing algorithm:
 * - Concatenate: spId + spPassword + timestamp
 * - Hash with SHA-256
 * - Encode with Base64
 */
export class MpesaEncryption {
  /**
   * Encrypt SP password using M-Pesa algorithm
   *
   * @param spId - Service Provider ID (business number)
   * @param password - Plain text password
   * @param timestamp - Timestamp in format YYYYMMDDHHmmss
   * @returns Base64 encoded SHA-256 hash
   *
   * @example
   * const encrypted = MpesaEncryption.encryptPassword('400205', 'myPassword', '20190221124032');
   * // Returns: 'base64_encoded_hash_string'
   */
  static encryptPassword(spId: string, password: string, timestamp: string): string {
    // Concatenate: spId + password + timestamp
    const combined = `${spId}${password}${timestamp}`;

    // Hash with SHA-256
    const hash = crypto.createHash('sha256').update(combined).digest();

    // Encode with Base64
    return Buffer.from(hash).toString('base64');
  }

  /**
   * Verify encrypted password matches expected value
   *
   * @param spId - Service Provider ID
   * @param password - Plain text password
   * @param timestamp - Timestamp used in encryption
   * @param encryptedPassword - Encrypted password to verify
   * @returns True if passwords match
   */
  static verifyPassword(
    spId: string,
    password: string,
    timestamp: string,
    encryptedPassword: string,
  ): boolean {
    const expectedHash = this.encryptPassword(spId, password, timestamp);
    return expectedHash === encryptedPassword;
  }

  /**
   * Generate M-Pesa timestamp
   * Format: YYYYMMDDHHmmss
   *
   * @param date - Optional date object (defaults to now)
   * @returns Formatted timestamp string
   *
   * @example
   * const timestamp = MpesaEncryption.generateTimestamp();
   * // Returns: '20250115143022'
   */
  static generateTimestamp(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  /**
   * Validate timestamp format
   *
   * @param timestamp - Timestamp string to validate
   * @returns True if format is valid (YYYYMMDDHHmmss)
   */
  static isValidTimestamp(timestamp: string): boolean {
    // Must be exactly 14 characters
    if (timestamp.length !== 14) {
      return false;
    }

    // Must be all digits
    if (!/^\d+$/.test(timestamp)) {
      return false;
    }

    // Parse components
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6));
    const day = parseInt(timestamp.substring(6, 8));
    const hours = parseInt(timestamp.substring(8, 10));
    const minutes = parseInt(timestamp.substring(10, 12));
    const seconds = parseInt(timestamp.substring(12, 14));

    // Validate ranges
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (hours < 0 || hours > 23) return false;
    if (minutes < 0 || minutes > 59) return false;
    if (seconds < 0 || seconds > 59) return false;

    return true;
  }

  /**
   * Check if timestamp is within acceptable time window
   * M-Pesa typically requires timestamp within 5 minutes
   *
   * @param timestamp - Timestamp to check
   * @param maxAgeMinutes - Maximum age in minutes (default: 5)
   * @returns True if timestamp is recent enough
   */
  static isTimestampRecent(timestamp: string, maxAgeMinutes: number = 5): boolean {
    if (!this.isValidTimestamp(timestamp)) {
      return false;
    }

    // Parse timestamp to Date
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(timestamp.substring(6, 8));
    const hours = parseInt(timestamp.substring(8, 10));
    const minutes = parseInt(timestamp.substring(10, 12));
    const seconds = parseInt(timestamp.substring(12, 14));

    const timestampDate = new Date(year, month, day, hours, minutes, seconds);
    const now = new Date();
    const diffMs = now.getTime() - timestampDate.getTime();
    const diffMinutes = diffMs / 1000 / 60;

    // Allow for small clock differences (check both past and future)
    return Math.abs(diffMinutes) <= maxAgeMinutes;
  }

  /**
   * Parse M-Pesa date format to JavaScript Date
   *
   * @param mpesaDate - M-Pesa date string (YYYY-MM-DD HH:mm:ss)
   * @returns JavaScript Date object
   *
   * @example
   * const date = MpesaEncryption.parseMpesaDate('2019-02-21 12:40:27');
   */
  static parseMpesaDate(mpesaDate: string): Date {
    // M-Pesa format: "2019-02-21 12:40:27"
    return new Date(mpesaDate.replace(' ', 'T'));
  }

  /**
   * Format Date to M-Pesa date format
   *
   * @param date - JavaScript Date object
   * @returns M-Pesa formatted date string (YYYY-MM-DD HH:mm:ss)
   */
  static formatMpesaDate(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}
