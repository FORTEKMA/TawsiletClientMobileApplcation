/**
 * VoIP Call Management Utilities for Tawsilet
 * Handles OneSignal notifications for VoIP calls between clients and drivers
 */

import axios from 'axios';
import { ONESIGNAL_DRIVER_APP_ID, ONESIGNAL_DRIVER_APP_API_KEY } from '@env';

/**
 * Send VoIP call notification to driver
 * @param {Object} params - Notification parameters
 * @param {string} params.driverId - Driver's OneSignal external ID
 * @param {string} params.callType - 'voice' or 'video'
 * @param {Object} params.caller - Caller information
 * @param {string} params.channelName - Agora channel name
 * @param {Object} params.orderData - Order information
 * @returns {Promise<Object>} OneSignal response
 */
export const sendVoIPCallNotification = async ({
  driverId,
  callType = 'voice',
  caller,
  channelName,
  orderData = {},
}) => {
  try {
    if (!driverId) {
      throw new Error('Driver ID is required for VoIP notification');
    }

    const callInfo = {
      type: "voip_call",
      callType: callType,
      channelName: channelName,
      caller: {
        id: caller?.id,
        firstName: caller?.firstName,
        lastName: caller?.lastName,
        phoneNumber: caller?.phoneNumber,
      },
      orderData: orderData,
      timestamp: Date.now(),
    };

    const notificationPayload = {
      app_id: ONESIGNAL_DRIVER_APP_ID,
      include_aliases: {
        external_id: [String(driverId)]
      },
      target_channel: "push",
      headings: {
        en: callType === 'video' ? 'Video Call' : 'Voice Call',
        ar: callType === 'video' ? 'مكالمة فيديو' : 'مكالمة صوتية',
        fr: callType === 'video' ? 'Appel vidéo' : 'Appel vocal'
      },
      contents: {
        en: `${caller?.firstName || 'User'} is calling you`,
        ar: `${caller?.firstName || 'المستخدم'} يتصل بك`,
        fr: `${caller?.firstName || 'Utilisateur'} vous appelle`
      },
      mutable_content: true,
      android_channel_id: 'voip_calls',
      android_accent_color: "#4CAF50",
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
      priority: 10,
      data: callInfo,
      // Add sound for incoming calls
      android_sound: "notification_sound",
      ios_sound: "notification_sound.wav",
    };

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          Authorization: `Basic ${ONESIGNAL_DRIVER_APP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('VoIP call notification sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send VoIP call notification:', error);
    throw error;
  }
};

/**
 * Send VoIP call action notification (accept/decline/end)
 * @param {Object} params - Action parameters
 * @param {string} params.driverId - Driver's OneSignal external ID
 * @param {string} params.action - 'accepted', 'declined', 'ended'
 * @param {Object} params.caller - Caller information
 * @param {string} params.channelName - Agora channel name
 * @param {Object} params.orderData - Order information
 * @returns {Promise<Object>} OneSignal response
 */
export const sendVoIPCallActionNotification = async ({
  driverId,
  action,
  caller,
  channelName,
  orderData = {},
}) => {
  try {
    if (!driverId) {
      throw new Error('Driver ID is required for VoIP action notification');
    }

    const actionInfo = {
      type: "voip_call_action",
      action: action,
      channelName: channelName,
      caller: {
        id: caller?.id,
        firstName: caller?.firstName,
        lastName: caller?.lastName,
      },
      orderData: orderData,
      timestamp: Date.now(),
    };

    const actionMessages = {
      accepted: {
        en: 'Call accepted',
        ar: 'تم قبول المكالمة',
        fr: 'Appel accepté'
      },
      declined: {
        en: 'Call declined',
        ar: 'تم رفض المكالمة',
        fr: 'Appel refusé'
      },
      ended: {
        en: 'Call ended',
        ar: 'تم إنهاء المكالمة',
        fr: 'Appel terminé'
      }
    };

    const notificationPayload = {
      app_id: ONESIGNAL_DRIVER_APP_ID,
      include_aliases: {
        external_id: [String(driverId)]
      },
      target_channel: "push",
      headings: {
        en: 'Call Update',
        ar: 'تحديث المكالمة',
        fr: 'Mise à jour appel'
      },
      contents: actionMessages[action] || {
        en: `Call ${action}`,
        ar: `تم ${action} المكالمة`,
        fr: `Appel ${action}`
      },
      mutable_content: true,
      android_channel_id: 'voip_calls',
      priority: 10,
      data: actionInfo,
    };

    const response = await axios.post(
      'https://onesignal.com/api/v1/notifications',
      notificationPayload,
      {
        headers: {
          Authorization: `Basic ${ONESIGNAL_DRIVER_APP_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('VoIP call action notification sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send VoIP call action notification:', error);
    throw error;
  }
};

/**
 * Generate unique channel name for VoIP calls
 * @param {string} orderId - Order ID
 * @param {string} driverId - Driver ID
 * @param {string} callerId - Caller ID
 * @returns {string} Unique channel name
 */
export const generateVoIPChannelName = (orderId, driverId, callerId) => {
  const timestamp = Date.now();
  return `tawsilet_voip_${orderId}_${driverId}_${callerId}_${timestamp}`;
};

/**
 * Validate VoIP call parameters
 * @param {Object} params - Call parameters to validate
 * @returns {boolean} True if parameters are valid
 */
export const validateVoIPCallParams = (params) => {
  const requiredFields = ['driverId', 'caller', 'channelName'];
  
  for (const field of requiredFields) {
    if (!params[field]) {
      console.error(`Missing required field for VoIP call: ${field}`);
      return false;
    }
  }
  
  if (!params.caller.id || !params.caller.firstName) {
    console.error('Invalid caller information for VoIP call');
    return false;
  }
  
  return true;
};

/**
 * Get call type display name
 * @param {string} callType - 'voice' or 'video'
 * @param {string} language - Language code ('en', 'ar', 'fr')
 * @returns {string} Display name for call type
 */
export const getCallTypeDisplayName = (callType, language = 'en') => {
  const displayNames = {
    voice: {
      en: 'Voice Call',
      ar: 'مكالمة صوتية',
      fr: 'Appel vocal'
    },
    video: {
      en: 'Video Call',
      ar: 'مكالمة فيديو',
      fr: 'Appel vidéo'
    }
  };
  
  return displayNames[callType]?.[language] || displayNames.voice[language];
};

/**
 * Get call action display name
 * @param {string} action - 'accepted', 'declined', 'ended'
 * @param {string} language - Language code ('en', 'ar', 'fr')
 * @returns {string} Display name for call action
 */
export const getCallActionDisplayName = (action, language = 'en') => {
  const actionNames = {
    accepted: {
      en: 'Call accepted',
      ar: 'تم قبول المكالمة',
      fr: 'Appel accepté'
    },
    declined: {
      en: 'Call declined',
      ar: 'تم رفض المكالمة',
      fr: 'Appel refusé'
    },
    ended: {
      en: 'Call ended',
      ar: 'تم إنهاء المكالمة',
      fr: 'Appel terminé'
    }
  };
  
  return actionNames[action]?.[language] || actionNames.ended[language];
};

export default {
  sendVoIPCallNotification,
  sendVoIPCallActionNotification,
  generateVoIPChannelName,
  validateVoIPCallParams,
  getCallTypeDisplayName,
  getCallActionDisplayName,
};

