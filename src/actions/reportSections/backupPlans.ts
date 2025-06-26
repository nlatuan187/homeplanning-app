import { ProjectionRow } from "@/lib/calculations/affordability";
import { type Plan as PrismaPlan } from "@prisma/client";

export interface BackupPlansReportData {
  plan: PrismaPlan;
  projectionData: ProjectionRow[];
  expertExplanation: {
    whyEmergencyFund: string;
  };
  alternativeBackupOptions: Array<{ title: string; description: string }>;
}

interface BackupPlansError {
  error: true;
  message: string;
  details: string;
}

/**
 * Generate the Backup Plans section of the report
 * This version returns static data as the UI component derives dynamic parts from plan/projectionData.
 */
export async function generateBackupPlansSection(
  plan: PrismaPlan,
  userContext: object, // Kept for future use if needed
  projectionData: ProjectionRow[]
): Promise<BackupPlansReportData | BackupPlansError> {
  try {
    // All calculations for EF chart and list are done in BackupPlansSection.tsx from projectionData.
    // This action now only provides static texts.
    
    // Alternative backup options (static)
    const alternativeOptions = [
      {
        title: "Vay mượn người thân, gia đình",
        description: "những người đủ tin tưởng và bạn không quá áp lực về việc phải trả lãi hoặc trả sớm."
      },
      {
        title: "Mở thẻ tín dụng có hạn mức đủ lớn",
        description: "và lãi suất nằm trong khả năng bạn có thể chi trả."
      },
      {
        title: "Các tài sản cá nhân có tính thanh khoản cao",
        description: "có thể bán đi lúc cấp bách."
      }
    ];
    
    // Return simplified structured data for UI rendering,
    // as BackupPlansSection.tsx derives chart data from plan and projectionData.
    // This action will primarily provide static texts and the list of alternative options.
    return {
      plan: plan,
      projectionData: projectionData,
      expertExplanation: {
        whyEmergencyFund: "Quỹ dự phòng giúp bạn đối phó với các rủi ro bất ngờ như ốm đau, mất việc hoặc tai nạn. Nó tạo ra lớp đệm an toàn, giúp bạn không phải vay mượn hay bán tài sản khi gặp khó khăn, qua đó duy trì được sự ổn định tài chính ngay cả trong những tình huống không lường trước."
      },
      alternativeBackupOptions: alternativeOptions,
    };
  } catch (error) {
    console.error(`Error generating Backup Plans section:`, error);
    return {
      error: true,
      message: `Chúng tôi gặp sự cố khi tạo phần này. Vui lòng làm mới trang để thử lại.`,
      details: error instanceof Error ? error.message : 'Lỗi không xác định'
    };
  }
}
