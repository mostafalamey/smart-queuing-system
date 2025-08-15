import { DashboardLayout } from '@/components/DashboardLayout';
import ManageTreePage from '../manage/tree';

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
