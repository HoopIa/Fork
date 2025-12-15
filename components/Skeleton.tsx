interface SkeletonProps {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div 
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      aria-hidden="true"
    />
  )
}

export function RecipeCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 p-6">
      <Skeleton className="h-32 w-full mb-4 rounded-lg" />
      <Skeleton className="h-6 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  )
}

export function RecipeDetailSkeleton() {
  return (
    <div className="bg-white border border-gray-100 p-8 sm:p-12">
      <Skeleton className="h-8 w-1/3 mb-8" />
      <div className="mb-12">
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-5 w-3/4" />
        </div>
      </div>
      <div>
        <Skeleton className="h-6 w-1/4 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    </div>
  )
}

