// Mock escrow for hackathon demo — same state machine as the real contract
interface MockEscrow {
  id: string;
  requester_wallet: string;
  carrier_wallet: string;
  amount_ton: number;
  protocol_fee_ton: number;
  state: 'empty' | 'funded' | 'released' | 'refunded';
  carrier_confirmed: boolean;
  requester_confirmed: boolean;
  created_at: number;
  deadline: number;  // Unix timestamp
}

const escrows = new Map<string, MockEscrow>();

export function createEscrow(matchId: number, requester: string, carrier: string, amount: number, feeBps: number = 500): MockEscrow {
  const fee = amount * feeBps / 10000;
  const escrow: MockEscrow = {
    id: `escrow_${matchId}`,
    requester_wallet: requester,
    carrier_wallet: carrier,
    amount_ton: amount,
    protocol_fee_ton: fee,
    state: 'funded',
    carrier_confirmed: false,
    requester_confirmed: false,
    created_at: Date.now(),
    deadline: Date.now() + 24 * 60 * 60 * 1000,
  };
  escrows.set(escrow.id, escrow);
  return escrow;
}

export function confirmDelivery(escrowId: string, role: 'carrier' | 'requester'): MockEscrow {
  const e = escrows.get(escrowId);
  if (!e) throw new Error('Escrow not found');
  if (e.state === 'released') throw new Error('Already released');

  if (role === 'carrier') e.carrier_confirmed = true;
  if (role === 'requester') e.requester_confirmed = true;

  if (e.carrier_confirmed && e.requester_confirmed) {
    e.state = 'released';
    // In real version: trigger on-chain release
    console.log(`[Escrow] Released: ${e.amount_ton - e.protocol_fee_ton} TON to carrier, ${e.protocol_fee_ton} TON protocol fee`);
  }
  return e;
}

export function refundEscrow(escrowId: string): MockEscrow {
  const e = escrows.get(escrowId);
  if (!e) throw new Error('Escrow not found');
  if (e.state === 'released') throw new Error('Already released');
  if (e.state === 'refunded') throw new Error('Already refunded');
  if (Date.now() < e.deadline) throw new Error('Deadline not passed');

  e.state = 'refunded';
  console.log(`[Escrow] Refunded: ${e.amount_ton} TON to requester`);
  return e;
}

export function getEscrow(escrowId: string): MockEscrow | undefined {
  return escrows.get(escrowId);
}
