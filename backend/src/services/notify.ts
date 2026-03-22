const BOT_URL = process.env.BOT_NOTIFICATION_URL || 'http://localhost:3002';

export async function notifyUser(telegramId: string, message: string): Promise<void> {
  try {
    await fetch(`${BOT_URL}/notify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_id: telegramId, message }),
    });
  } catch (e) {
    console.error('Bot notification failed (non-fatal):', e);
    // Non-fatal: don't crash the API if bot is down
  }
}
