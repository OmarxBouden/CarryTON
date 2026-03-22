import { Bot, InlineKeyboard, Context } from 'grammy';
import express from 'express';
import 'dotenv/config';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
const MINI_APP_URL = process.env.MINI_APP_URL || 'https://carryton.vercel.app';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

// Helper to call backend
async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  return res.json();
}

// /start — welcome message with Mini App button
bot.command('start', async (ctx) => {
  const keyboard = new InlineKeyboard()
    .webApp('Open CarryTON 📦', MINI_APP_URL);

  await ctx.reply(
    '📦 *CarryTON*\n\n' +
    '_Everyone\'s going somewhere. Someone\'s going your way._\n\n' +
    'Post trips, request deliveries, and let our AI find the perfect match.\n\n' +
    'Tap below to get started!',
    { parse_mode: 'Markdown', reply_markup: keyboard }
  );

  // Upsert user in backend
  const user = ctx.from;
  if (user) {
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        telegram_id: String(user.id),
        username: user.username || null,
        display_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
      }),
    }).catch(console.error);
  }
});

// /trip <from> <to> <time> — quick trip posting
bot.command('trip', async (ctx) => {
  const text = ctx.message?.text || '';
  const parts = text.split(/\s+/).slice(1); // remove /trip

  if (parts.length < 3) {
    return ctx.reply(
      '📝 *Post a trip*\n\n' +
      'Usage: `/trip Lausanne Geneva 09:00`\n' +
      'Or open the app for the full form:',
      {
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().webApp('Post trip', `${MINI_APP_URL}/trip/new`),
      }
    );
  }

  const [from, to, time] = parts;
  // Create trip via backend — first get user
  const userData = await api(`/users/${ctx.from?.id}`).catch(() => null);
  if (!userData?.user) {
    return ctx.reply('Please /start first to register!');
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [hours, minutes] = time.split(':').map(Number);
  tomorrow.setHours(hours || 9, minutes || 0, 0, 0);

  const tripData = await api('/trips', {
    method: 'POST',
    body: JSON.stringify({
      carrier_id: userData.user.id,
      from_city: from,
      to_city: to,
      departure_time: tomorrow.toISOString(),
      max_size: 'small',
      max_weight_kg: 5,
    }),
  }).catch(console.error);

  if (tripData?.trip) {
    await ctx.reply(
      `✅ Trip posted!\n\n` +
      `🚗 ${from} → ${to}\n` +
      `🕐 ${time}\n` +
      `📦 Can carry: small package\n\n` +
      `Carriers can now find and accept deliveries on your route.`,
      {
        reply_markup: new InlineKeyboard().webApp('View trip', `${MINI_APP_URL}/trip/${tripData.trip.id}`),
      }
    );
  } else {
    await ctx.reply('Something went wrong. Try again or use the app.');
  }
});

// /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    '📦 *CarryTON Commands*\n\n' +
    '`/start` — Open the app\n' +
    '`/trip <from> <to> <time>` — Post a trip quickly\n' +
    '`/help` — This message\n\n' +
    'For full features, use the Mini App!',
    { parse_mode: 'Markdown' }
  );
});

bot.start();
console.log('🤖 CarryTON Bot is running');

// ---- Notification server for backend to push messages ----
const notifyApp = express();
notifyApp.use(express.json());

notifyApp.post('/notify', async (req, res) => {
  const { telegram_id, message } = req.body;
  try {
    await bot.api.sendMessage(telegram_id, message, { parse_mode: 'Markdown' });
    res.json({ ok: true });
  } catch (e) {
    console.error('Notification failed:', e);
    res.json({ ok: false });
  }
});

notifyApp.listen(3002, () => console.log('Bot notification server on :3002'));
