'use client'

import { DashboardLayout } from '@/components/DashboardLayout';
import ManageTreePage from '../manage/tree';

// Force dynamic rendering for client-side features
export const dynamic = 'force-dynamic'

export default function TreePage() {
  return (
    <DashboardLayout>
      {/* Full-screen tree view with proper overflow management */}
      <div className="h-screen w-full overflow-hidden">
        <ManageTreePage />
      </div>
    </DashboardLayout>
  );
}
