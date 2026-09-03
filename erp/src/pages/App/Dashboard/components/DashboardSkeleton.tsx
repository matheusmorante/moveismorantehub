import React from 'react';

const SkeletonBox = ({ className = '' }: { className?: string }) => (
    <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-2xl ${className}`} />
);

export const KpiSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-3">
                <div className="flex justify-between">
                    <SkeletonBox className="w-10 h-10 rounded-xl" />
                    <SkeletonBox className="w-14 h-6 rounded-full" />
                </div>
                <SkeletonBox className="w-3/4 h-3 rounded" />
                <SkeletonBox className="w-1/2 h-8 rounded" />
            </div>
        ))}
    </div>
);

export const ChartSkeleton = () => (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex justify-between items-start">
            <div className="space-y-2">
                <SkeletonBox className="w-48 h-6 rounded" />
                <SkeletonBox className="w-32 h-3 rounded" />
            </div>
            <SkeletonBox className="w-24 h-8 rounded-xl" />
        </div>
        <SkeletonBox className="w-full h-52 rounded-xl" />
    </div>
);

export const PanelSkeleton = ({ rows = 3 }: { rows?: number }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-3">
        <SkeletonBox className="w-1/3 h-5 rounded" />
        {Array.from({ length: rows }).map((_, i) => (
            <SkeletonBox key={i} className="w-full h-12 rounded-xl" />
        ))}
    </div>
);
