'use client';
import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { getRequest } from '@/lib/api';
import type { DeliveryRequest } from '../../../../../shared/types';

export default function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRequest(parseInt(id))
      .then(setRequest)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex items-center justify-center">
        <div className="text-3xl animate-pulse">📦</div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col items-center justify-center p-4">
        <p className="text-gray-500">Request not found.</p>
        <button onClick={() => router.push('/')} className="mt-4 text-[#2AABEE] text-sm font-semibold">Go home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black anim-in">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 pt-4 pb-3 sticky top-0 z-10 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Back"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-gray-700 dark:text-gray-300">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Request details</h1>
      </div>

      <div className="px-4 py-5 flex flex-col gap-4 pb-24">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4">
          <p className="text-xl font-bold text-gray-900 dark:text-white mb-3">{request.from_city} → {request.to_city}</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">{request.package_size}</span>
            {request.urgency === 'urgent' && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">Urgent</span>
            )}
            {request.is_errand && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Errand</span>
            )}
            <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 capitalize">{request.status}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col gap-3">
          {request.package_desc && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Description</span>
              <span className="text-sm text-gray-900 dark:text-white">{request.package_desc}</span>
            </div>
          )}
          {request.budget_ton != null && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Budget</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{request.budget_ton} TON</span>
            </div>
          )}
          {request.deadline && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Deadline</span>
              <span className="text-sm text-gray-900 dark:text-white">{new Date(request.deadline).toLocaleString('en-CH')}</span>
            </div>
          )}
          {request.is_errand && request.errand_details && (
            <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 font-semibold mb-1">Errand details</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{request.errand_details}</p>
            </div>
          )}
        </div>

        {request.status === 'open' && (
          <button
            onClick={() => router.push(`/match/${request.id}`)}
            className="w-full bg-[#2AABEE] text-white rounded-2xl py-4 text-sm font-bold active:scale-[0.98] transition-transform"
          >
            Find carriers
          </button>
        )}
      </div>
    </div>
  );
}
