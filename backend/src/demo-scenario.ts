// Demo prep script — run before the pitch: npm run demo:prep
// Resets DB to clean seed state and prints the cheat sheet.

import './seed';

console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551              CARRYTON DEMO CHEATSHEET               \u2551
\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563
\u2551                                                      \u2551
\u2551  Demo user: Bob W. (tg_bob)                          \u2551
\u2551  URL: http://localhost:3000                           \u2551
\u2551                                                      \u2551
\u2551  DEMO FLOW:                                          \u2551
\u2551  1. Show home feed (8 trips visible)                 \u2551
\u2551  2. Post request: Lausanne \u2192 Lyon, small, 10 BXC     \u2551
\u2551  3. AI finds multi-hop: Alice (Lau\u2192GVA) + Marco      \u2551
\u2551     (GVA\u2192Lyon)                                       \u2551
\u2551  4. Accept match \u2192 show tracker                      \u2551
\u2551  5. Show profile \u2192 badges + avatar                   \u2551
\u2551                                                      \u2551
\u2551  BACKUP: If AI matching fails, there's a seeded      \u2551
\u2551  in-transit match at /job/2 you can show directly     \u2551
\u2551                                                      \u2551
\u2551  RESET: curl http://localhost:3001/api/demo/reset     \u2551
\u2551  or: npm run demo:prep                                \u2551
\u2551                                                      \u2551
\u255a\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255d
`);
