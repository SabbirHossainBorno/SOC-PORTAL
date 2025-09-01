//app/components/LoadingSpinner.js
import Image from 'next/image';

const LoadingSpinner = () => (
  <div className="relative flex justify-center items-center min-h-screen">
    {/* Spinner */}
    <div className="absolute animate-spin rounded-full h-36 w-36 
                border-t-4 border-b-4 
                border-t-orange-500 border-b-red-600 
                border-l-transparent border-r-transparent">
    </div>
    
    {/* Image */}
    <Image 
    src="/logo/loading.svg" 
    alt="Thinking Avatar" 
    width={96} 
    height={96} 
    className="rounded-full" 
    />
  </div>
);

export default LoadingSpinner;
