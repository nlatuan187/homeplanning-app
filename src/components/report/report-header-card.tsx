"use client";

interface ReportHeaderCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode; // Optional icon
  gradientImage?: string; // Add gradient image prop
}

const ReportHeaderCard: React.FC<ReportHeaderCardProps> = ({ title, description, icon, gradientImage }) => {
  return (
    <div 
      className="p-4 py-5 md:p-6 rounded-xl shadow-lg relative overflow-hidden" // Added relative and overflow-hidden
    >
      {gradientImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center z-0"
          style={{ backgroundImage: `url(${gradientImage})` }}
        ></div>
      )}
       <div className="absolute inset-0 bg-black/40 backdrop-blur-sm z-10"></div> {/* Overlay */}
      <div className="relative z-20"> {/* Content container */}
        {icon && <div className="mb-2 text-white">{icon}</div>}
        <h2 className="text-base sm:text-lg font-semibold mb-1 text-white">{title}</h2> 
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};

export default ReportHeaderCard;
