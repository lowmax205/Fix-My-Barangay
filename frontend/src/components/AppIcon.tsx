'use client';

import Image from 'next/image';

// Function to get the best icon size based on requested size
function getBestIconSize(requestedSize: number): string {
  const availableSizes = [48, 72, 96, 144, 192, 512];
  
  // Find the smallest icon that's >= requested size, or the largest available
  const bestSize = availableSizes.find(size => size >= requestedSize) || 512;
  
  return `/icons/android-launchericon-${bestSize}-${bestSize}.png`;
}

// App Icon Component using actual PWA icons
export function AppIcon({ size = 24, className = "" }: { size?: number, className?: string }) {
  const iconPath = getBestIconSize(size);
  
  return (
    <div 
      className={`inline-flex items-center justify-center rounded-lg overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={iconPath}
        alt="Fix My Barangay"
        width={size}
        height={size}
        className="w-full h-full object-cover"
        priority={size >= 48} // Prioritize larger icons
      />
    </div>
  );
}

export { generateIconDataUri } from '@/lib/icons';

export default AppIcon;