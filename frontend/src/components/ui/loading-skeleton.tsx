'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('shimmer rounded-md bg-muted', className)}
      style={style}
      aria-hidden="true"
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-24" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex gap-4 px-4 py-2">
        {[40, 20, 20, 20].map((w, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex gap-4 items-center px-4 py-3 border rounded-xl"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="flex items-center gap-3 flex-[2]">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2 h-48 px-4">
        {[60, 85, 45, 90, 70, 55, 80, 65, 75, 50, 88, 72].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end">
            <Skeleton
              className="w-full rounded-t-sm"
              style={{ height: `${h}%`, animationDelay: `${i * 0.05}s` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between px-4">
        {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
          'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map((m) => (
          <Skeleton key={m} className="h-3 w-6" />
        ))}
      </div>
    </div>
  );
}

export function RoomGridSkeleton() {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
      {Array.from({ length: 20 }).map((_, i) => (
        <Skeleton
          key={i}
          className="aspect-square rounded-xl"
          style={{ animationDelay: `${i * 0.04}s` }}
        />
      ))}
    </div>
  );
}
