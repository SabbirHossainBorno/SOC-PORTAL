//app/components/SmallSpinner.js
import Image from 'next/image';

const SmallSpinner = () => (
  <div className="relative flex justify-center items-center mx-auto" style={{ width: '32px', height: '32px' }}>
    <div className="absolute animate-spin rounded-full h-full w-full border-t-2 border-b-2 border-t-orange-500 border-b-red-600 border-l-transparent border-r-transparent"></div>
    <Image 
      src="/logo/loading.svg" 
      alt="Loading" 
      width={16} 
      height={16} 
      className="rounded-full" 
    />
  </div>
);

export default SmallSpinner;