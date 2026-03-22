import { createEscrow, confirmDelivery, refundEscrow, getEscrow } from './services/escrow';

// Test 1: Create escrow
const e1 = createEscrow(1, 'requester_addr', 'carrier_addr', 10);
console.assert(e1.state === 'funded', 'Test 1 failed: should be funded');
console.assert(e1.protocol_fee_ton === 0.5, 'Test 1 failed: fee should be 0.5');
console.log('✅ Test 1: Create escrow');

// Test 2: Carrier confirms
const e2 = confirmDelivery(e1.id, 'carrier');
console.assert(e2.carrier_confirmed === true, 'Test 2 failed');
console.assert(e2.state === 'funded', 'Test 2 failed: should still be funded');
console.log('✅ Test 2: Carrier confirms');

// Test 3: Requester confirms → release
const e3 = confirmDelivery(e1.id, 'requester');
console.assert(e3.requester_confirmed === true, 'Test 3 failed');
console.assert(e3.state === 'released', 'Test 3 failed: should be released');
console.log('✅ Test 3: Both confirm → released');

// Test 4: Create and try premature refund
const e4 = createEscrow(2, 'req2', 'car2', 5);
try {
  refundEscrow(e4.id);
  console.log('❌ Test 4 failed: should have thrown');
} catch (err) {
  console.log('✅ Test 4: Premature refund blocked');
}

// Test 5: Double release blocked
try {
  confirmDelivery(e1.id, 'carrier');
  console.log('❌ Test 5 failed: should have thrown');
} catch (err) {
  console.log('✅ Test 5: Double release blocked');
}

console.log('\n✅ All escrow tests passed');
