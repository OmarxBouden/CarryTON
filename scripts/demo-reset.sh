#!/bin/bash
echo "🔄 Resetting demo data..."
cd backend && npm run seed
echo "✅ Demo data reset complete!"
