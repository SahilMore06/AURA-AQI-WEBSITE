/**
 * AURA Activity Logger
 * ─────────────────────────────────────────────────────────────────────────────
 * Fire-and-forget. Never throws. Never blocks the UI.
 * Writes every user action to Supabase `activity_log`, tied to user's email.
 *
 * Usage (anywhere in the app):
 *   import { logEvent } from '../services/activityLogger';
 *   logEvent('aqi_fetch', { city: 'Mumbai', aqi: 85 });
 */

import { supabase } from '../lib/supabase';

export type EventType =
  | 'sign_in'             // email/password login
  | 'sign_up'             // new account created
  | 'sign_out'            // user logged out
  | 'oauth_sign_in'       // google/github OAuth
  | 'registration_complete' // profile setup done
  | 'aqi_fetch'           // dashboard AQI data loaded
  | 'aqi_refresh'         // manual dashboard refresh
  | 'map_view'            // Map page opened
  | 'map_city_selected'   // user clicked a city on map
  | 'analytics_view'      // Analytics page opened
  | 'analytics_export'    // CSV exported
  | 'profile_save'        // Settings profile saved
  | 'alert_save'          // Alert threshold saved
  | 'report_generated';   // IEEE report generated

export interface LogPayload {
  [key: string]: any;
}

/**
 * Log a user event to Supabase activity_log.
 * Completely non-blocking — call it without await.
 */
export function logEvent(
  eventType: EventType,
  data: LogPayload = {},
  page?: string
): void {
  // Fire and forget — no await, no try/catch in caller needed
  _writeLog(eventType, data, page);
}

async function _writeLog(
  eventType: EventType,
  data: LogPayload,
  page?: string
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // Not logged in — skip silently

    await supabase.from('activity_log').insert({
      user_id: session.user.id,
      user_email: session.user.email,
      event_type: eventType,
      event_data: data,
      page: page ?? window.location.pathname,
    });
  } catch {
    // Never surface errors to the user — logging is a side effect only
  }
}
