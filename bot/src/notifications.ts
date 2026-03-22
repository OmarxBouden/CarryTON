import { Bot, InlineKeyboard } from 'grammy';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://carryton.vercel.app';

export async function notifyMatchFound(
  bot: Bot,
  telegramId: string,
  matchData: {
    from: string;
    to: string;
    carrier_name: string;
    carrier_rating: number;
    fee_ton: number;
    fiat: string;
    match_id: number;
  }
) {
  await bot.api.sendMessage(
    telegramId,
    `🎯 Match found for your delivery!\n${matchData.from} → ${matchData.to}\nCarrier: ${matchData.carrier_name} (${matchData.carrier_rating}⭐)\nFee: ${matchData.fee_ton} TON (~${matchData.fiat})\n\nOpen the app to accept:`,
    {
      reply_markup: new InlineKeyboard().webApp(
        'View match 📦',
        `${MINI_APP_URL}/match/${matchData.match_id}`
      ),
    }
  );
}

export async function notifyJobAccepted(
  bot: Bot,
  carrierTelegramId: string,
  requesterTelegramId: string,
  matchData: {
    from: string;
    to: string;
    departure_time: string;
    carrier_name: string;
    match_id: number;
  }
) {
  await bot.api.sendMessage(
    carrierTelegramId,
    `📦 New job accepted! Pick up from ${matchData.from} before ${matchData.departure_time}`
  );
  await bot.api.sendMessage(
    requesterTelegramId,
    `✅ ${matchData.carrier_name} accepted your delivery. Escrow funded.`,
    {
      reply_markup: new InlineKeyboard().webApp(
        'Track delivery',
        `${MINI_APP_URL}/job/${matchData.match_id}`
      ),
    }
  );
}

export async function notifyPickup(
  bot: Bot,
  requesterTelegramId: string,
  hopData: {
    carrier_name: string;
    from: string;
    to: string;
    match_id: number;
  }
) {
  await bot.api.sendMessage(
    requesterTelegramId,
    `🚗 Your package is on the move!\n${hopData.carrier_name} picked up in ${hopData.from}, heading to ${hopData.to}`,
    {
      reply_markup: new InlineKeyboard().webApp(
        'Track delivery',
        `${MINI_APP_URL}/job/${hopData.match_id}`
      ),
    }
  );
}

export async function notifyDelivered(
  bot: Bot,
  requesterTelegramId: string,
  matchData: {
    match_id: number;
  }
) {
  await bot.api.sendMessage(
    requesterTelegramId,
    `📬 Package delivered! Please confirm receipt in the app to release payment.`,
    {
      reply_markup: new InlineKeyboard().webApp(
        'Confirm delivery ✅',
        `${MINI_APP_URL}/job/${matchData.match_id}`
      ),
    }
  );
}

export async function notifyPaymentReleased(
  bot: Bot,
  carrierTelegramId: string,
  amount: number,
  fiat: string
) {
  await bot.api.sendMessage(
    carrierTelegramId,
    `💰 Payment received!\n+${amount} TON (~${fiat})\nGreat job! Your reputation has been updated.`
  );
}

export async function broadcastTripToGroup(
  bot: Bot,
  groupChatId: string | number,
  trip: {
    from_city: string;
    to_city: string;
    departure_time: string;
    carrier_name: string;
    max_size: string;
    price_ton: number | null;
    id: number;
  }
) {
  const time = new Date(trip.departure_time).toLocaleTimeString('en-CH', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const priceText = trip.price_ton ? `${trip.price_ton} TON` : 'Price TBD';

  await bot.api.sendMessage(
    groupChatId,
    `🚗 New trip on CarryTON!\n${trip.from_city} → ${trip.to_city} · ${time}\nCarrier: ${trip.carrier_name} · Can carry ${trip.max_size}\n${priceText}\n\nNeed something delivered on this route?`,
    {
      reply_markup: new InlineKeyboard().webApp(
        'View trip 📦',
        `${MINI_APP_URL}/trip/${trip.id}`
      ),
    }
  );
}
