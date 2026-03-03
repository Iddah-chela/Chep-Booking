import React from 'react'

// Shimmer animation wrapper
const Shimmer = ({ className = '', children }) => (
  <div className={`animate-pulse ${className}`}>{children}</div>
)

// Property card skeleton — matches AllRooms listing layout
export const PropertyCardSkeleton = () => (
  <Shimmer className='flex flex-col md:flex-row items-start py-10 gap-6 border-b border-gray-300 dark:border-gray-700'>
    {/* Image placeholder */}
    <div className='w-full md:w-1/2 h-56 md:h-65 bg-gray-200 dark:bg-gray-700 rounded-xl' />
    {/* Text placeholders */}
    <div className='md:w-1/2 flex flex-col gap-3 w-full'>
      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-24' />
      <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4' />
      <div className='flex gap-3 mt-1'>
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-20' />
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-28' />
      </div>
      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mt-2' />
      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6' />
      <div className='flex gap-2 mt-3'>
        <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24' />
        <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-20' />
        <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-28' />
      </div>
      <div className='h-7 bg-gray-200 dark:bg-gray-700 rounded w-32 mt-3' />
    </div>
  </Shimmer>
)

// Property detail page skeleton
export const PropertyDetailSkeleton = () => (
  <div className='py-28 md:py-35 px-4 md:px-16 lg:px-24 xl:px-32 animate-pulse'>
    {/* Back button + title */}
    <div className='flex items-center gap-3 mb-6'>
      <div className='h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg' />
      <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-64' />
    </div>
    {/* Image gallery */}
    <div className='flex gap-3 mb-8'>
      <div className='w-2/3 h-80 bg-gray-200 dark:bg-gray-700 rounded-xl' />
      <div className='w-1/3 flex flex-col gap-3'>
        <div className='h-38 bg-gray-200 dark:bg-gray-700 rounded-xl' />
        <div className='h-38 bg-gray-200 dark:bg-gray-700 rounded-xl' />
      </div>
    </div>
    {/* Info row */}
    <div className='flex gap-4 mb-6'>
      <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-32' />
      <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-48' />
    </div>
    {/* Building grid placeholder */}
    <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded w-40 mb-3' />
    <div className='grid grid-cols-6 gap-1 max-w-xs'>
      {[...Array(12)].map((_, i) => (
        <div key={i} className='h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded' />
      ))}
    </div>
  </div>
)

// Booking row skeleton
export const BookingRowSkeleton = () => (
  <Shimmer className='grid grid-cols-1 md:grid-cols-[3fr_2fr_1fr] w-full border-b border-gray-300 dark:border-gray-700 py-6 gap-4'>
    <div className='flex gap-4'>
      <div className='h-24 w-36 bg-gray-200 dark:bg-gray-700 rounded-lg' />
      <div className='flex flex-col gap-2'>
        <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-40' />
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-28' />
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-20' />
      </div>
    </div>
    <div className='flex flex-col gap-2'>
      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-24' />
      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-32' />
    </div>
    <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24' />
  </Shimmer>
)

// Chat list skeleton
export const ChatListSkeleton = () => (
  <Shimmer className='flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700'>
    <div className='h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0' />
    <div className='flex-1 flex flex-col gap-2'>
      <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-36' />
      <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-56' />
    </div>
    <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-12' />
  </Shimmer>
)

// Viewing request skeleton
export const ViewingSkeleton = () => (
  <Shimmer className='border border-gray-200 dark:border-gray-700 rounded-lg p-5'>
    <div className='flex justify-between items-start'>
      <div className='flex gap-4'>
        <div className='h-16 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg' />
        <div className='flex flex-col gap-2'>
          <div className='h-5 bg-gray-200 dark:bg-gray-700 rounded w-44' />
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-32' />
          <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-24' />
        </div>
      </div>
      <div className='h-7 bg-gray-200 dark:bg-gray-700 rounded-full w-20' />
    </div>
  </Shimmer>
)

// Managed property skeleton
export const ManagedPropertySkeleton = () => (
  <Shimmer className='border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-white dark:bg-gray-800 shadow-sm'>
    <div className='flex justify-between items-start mb-4'>
      <div className='flex flex-col gap-2'>
        <div className='h-6 bg-gray-200 dark:bg-gray-700 rounded w-48' />
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-64' />
        <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-36' />
      </div>
      <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-32' />
    </div>
    <div className='flex gap-4 mb-4'>
      <div className='h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-24' />
      <div className='h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-24' />
      <div className='h-9 bg-gray-200 dark:bg-gray-700 rounded-lg w-20' />
    </div>
    <div className='grid grid-cols-5 gap-1 max-w-xs'>
      {[...Array(10)].map((_, i) => (
        <div key={i} className='h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded' />
      ))}
    </div>
  </Shimmer>
)

export default {
  PropertyCardSkeleton,
  PropertyDetailSkeleton,
  BookingRowSkeleton,
  ChatListSkeleton,
  ViewingSkeleton,
  ManagedPropertySkeleton
}
