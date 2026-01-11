import { getSupabaseAdmin } from '@/lib/supabase';
import * as http2 from 'http2';
import * as jwt from 'jsonwebtoken';

// APNs configuration
const APNS_HOST_PRODUCTION = 'api.push.apple.com';
const APNS_HOST_SANDBOX = 'api.sandbox.push.apple.com';
const APNS_PORT = 443;

// Environment variables for APNs
// These should be set in .env.local:
// APNS_KEY_ID - The Key ID from Apple Developer Portal
// APNS_TEAM_ID - Your Apple Developer Team ID
// APNS_PRIVATE_KEY - The contents of your .p8 file (with \n for newlines)
// APNS_BUNDLE_ID - Your app's bundle ID (e.g., ai.realworth.app)
// APNS_ENVIRONMENT - 'production' or 'sandbox'

type NotificationType = 'appraisal_complete' | 'friend_request' | 'friend_accepted' | 'general';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  badge?: number;
  sound?: string;
}

interface APNsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    badge?: number;
    sound?: string;
    'mutable-content'?: number;
    'content-available'?: number;
  };
  [key: string]: unknown;
}

class NotificationService {
  private jwtToken: string | null = null;
  private jwtExpiration: number = 0;

  /**
   * Generate a JWT token for APNs authentication
   */
  private generateJWT(): string {
    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;
    const privateKey = process.env.APNS_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!keyId || !teamId || !privateKey) {
      throw new Error('Missing APNs configuration. Please set APNS_KEY_ID, APNS_TEAM_ID, and APNS_PRIVATE_KEY');
    }

    const now = Math.floor(Date.now() / 1000);

    // Check if existing token is still valid (tokens last 1 hour, we refresh at 50 minutes)
    if (this.jwtToken && this.jwtExpiration > now + 600) {
      return this.jwtToken;
    }

    // Generate new JWT
    const token = jwt.sign(
      {
        iss: teamId,
        iat: now,
      },
      privateKey,
      {
        algorithm: 'ES256',
        header: {
          alg: 'ES256',
          kid: keyId,
        },
      }
    );

    this.jwtToken = token;
    this.jwtExpiration = now + 3600; // Token valid for 1 hour

    return token;
  }

  /**
   * Send a push notification to a single device via APNs
   */
  private async sendToAPNs(deviceToken: string, payload: APNsPayload): Promise<boolean> {
    const bundleId = process.env.APNS_BUNDLE_ID || 'ai.realworth.app';
    const environment = process.env.APNS_ENVIRONMENT || 'sandbox';
    const host = environment === 'production' ? APNS_HOST_PRODUCTION : APNS_HOST_SANDBOX;

    return new Promise((resolve) => {
      try {
        const jwtToken = this.generateJWT();

        const client = http2.connect(`https://${host}:${APNS_PORT}`);

        client.on('error', (err) => {
          console.error('[NotificationService] HTTP/2 connection error:', err);
          resolve(false);
        });

        const headers = {
          ':method': 'POST',
          ':path': `/3/device/${deviceToken}`,
          'authorization': `bearer ${jwtToken}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'apns-priority': '10',
          'apns-expiration': '0',
        };

        const req = client.request(headers);

        let responseStatus = 0;
        let responseData = '';

        req.on('response', (headers) => {
          responseStatus = headers[':status'] as number;
        });

        req.on('data', (chunk) => {
          responseData += chunk;
        });

        req.on('end', () => {
          client.close();

          if (responseStatus === 200) {
            console.log('[NotificationService] Push notification sent successfully');
            resolve(true);
          } else {
            console.error('[NotificationService] APNs error:', responseStatus, responseData);
            resolve(false);
          }
        });

        req.on('error', (err) => {
          console.error('[NotificationService] Request error:', err);
          client.close();
          resolve(false);
        });

        req.write(JSON.stringify(payload));
        req.end();
      } catch (error) {
        console.error('[NotificationService] Error sending to APNs:', error);
        resolve(false);
      }
    });
  }

  /**
   * Build APNs payload from notification data
   */
  private buildPayload(notification: NotificationPayload): APNsPayload {
    const payload: APNsPayload = {
      aps: {
        alert: {
          title: notification.title,
          body: notification.body,
        },
        sound: notification.sound || 'default',
        'mutable-content': 1,
      },
    };

    if (notification.badge !== undefined) {
      payload.aps.badge = notification.badge;
    }

    // Add custom data
    if (notification.data) {
      Object.entries(notification.data).forEach(([key, value]) => {
        payload[key] = value;
      });
    }

    return payload;
  }

  /**
   * Get all device tokens for a user
   */
  async getUserDeviceTokens(userId: string): Promise<Array<{ token: string; platform: string }>> {
    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } = await supabaseAdmin
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (error) {
      console.error('[NotificationService] Error fetching device tokens:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Send a push notification to a specific user
   */
  async sendToUser(
    userId: string,
    notification: NotificationPayload
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    console.log('[NotificationService] Sending notification to user:', userId);

    const deviceTokens = await this.getUserDeviceTokens(userId);

    if (deviceTokens.length === 0) {
      console.log('[NotificationService] No device tokens found for user');
      return { success: true, sent: 0, failed: 0 };
    }

    const payload = this.buildPayload(notification);
    let sent = 0;
    let failed = 0;

    for (const { token, platform } of deviceTokens) {
      if (platform === 'ios') {
        const success = await this.sendToAPNs(token, payload);
        if (success) {
          sent++;
          // Update last_used_at
          await this.updateLastUsed(userId, token);
        } else {
          failed++;
        }
      } else {
        // TODO: Add FCM support for Android/web
        console.log('[NotificationService] Skipping non-iOS platform:', platform);
      }
    }

    console.log('[NotificationService] Notification results:', { sent, failed });
    return { success: failed === 0, sent, failed };
  }

  /**
   * Update last_used_at timestamp for a device token
   */
  private async updateLastUsed(userId: string, token: string): Promise<void> {
    const supabaseAdmin = getSupabaseAdmin();

    await supabaseAdmin
      .from('device_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('token', token);
  }

  /**
   * Send notification when an appraisal is complete
   */
  async notifyAppraisalComplete(
    userId: string,
    appraisalData: { itemName: string; priceRange: { low: number; high: number } }
  ): Promise<void> {
    const avgValue = Math.round((appraisalData.priceRange.low + appraisalData.priceRange.high) / 2);
    const formattedValue = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(avgValue);

    await this.sendToUser(userId, {
      title: 'Appraisal Complete!',
      body: `Your ${appraisalData.itemName} is valued at ${formattedValue}`,
      data: {
        type: 'appraisal_complete',
      },
    });
  }

  /**
   * Send notification when a friend request is received
   */
  async notifyFriendRequest(
    userId: string,
    requesterName: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'New Friend Request',
      body: `${requesterName} wants to be your friend`,
      data: {
        type: 'friend_request',
      },
    });
  }

  /**
   * Send notification when a friend request is accepted
   */
  async notifyFriendAccepted(
    userId: string,
    friendName: string
  ): Promise<void> {
    await this.sendToUser(userId, {
      title: 'Friend Request Accepted',
      body: `${friendName} accepted your friend request`,
      data: {
        type: 'friend_accepted',
      },
    });
  }

  /**
   * Check if APNs is configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_PRIVATE_KEY &&
      process.env.APNS_BUNDLE_ID
    );
  }
}

export const notificationService = new NotificationService();
