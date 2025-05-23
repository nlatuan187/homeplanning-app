"use client";

interface ReportHeaderCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode; // Optional icon
}

const ReportHeaderCard: React.FC<ReportHeaderCardProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white text-slate-900 p-4 py-5 md:p-6 rounded-xl shadow-lg mx-4 md:mx-0 my-3"> {/* Adjusted padding and margin */}
      {icon && <div className="mb-2">{icon}</div>}
      {/* Adjusted text styles to match design E1 */}
      <h2 className="text-base sm:text-lg font-semibold mb-1 text-slate-700">{title}</h2> 
      <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default ReportHeaderCard;
