//app/components/MediumSpinner.js
import Image from 'next/image';

const MediumSpinner = () => (
  <div className="relative flex justify-center items-center w-16 h-16 mx-auto">
    <div className="absolute animate-spin rounded-full h-full w-full 
                    border-t-3 border-b-3 
                    border-t-orange-500 border-b-red-600 
                    border-l-transparent border-r-transparent">
    </div>
    
    <Image 
      src="/logo/loading.svg" 
      alt="Loading" 
      width={38} 
      height={38} 
      className="rounded-full" 
    />
  </div>
);

export default MediumSpinner;