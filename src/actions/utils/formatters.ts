/**
 * Utility functions for formatting content in the report
 */

/**
 * Format a number as a currency string with commas
 */
export function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString();
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Format a number with commas
 */
export function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  });
}

/**
 * Process AI-generated content into a structured markdown format
 */
export function processAIContent(content: string): string {
  // Check if content is already in markdown format
  if (content.includes('##') || content.includes('#')) {
    return content; // Already in markdown format
  }

  // Format the content into markdown
  const lines = content.split('\n');
  let formattedContent = '';
  let currentSection = '';

  for (const line of lines) {
    if (line.startsWith('# Tình hình hiện tại') || line.startsWith('## Tình hình hiện tại')) {
      currentSection = 'currentSituation';
      formattedContent += '## Tình hình hiện tại\n\n';
    } else if (line.startsWith('# Giải thích của chuyên gia') || line.startsWith('## Giải thích của chuyên gia')) {
      currentSection = 'expertExplanation';
      formattedContent += '## Giải thích của chuyên gia\n\n';
    } else if (line.startsWith('# Khuyến nghị của chuyên gia') || line.startsWith('## Khuyến nghị của chuyên gia')) {
      currentSection = 'recommendations';
      formattedContent += '## Khuyến nghị của chuyên gia\n\n';
    } else if (currentSection) {
      formattedContent += line + '\n';
    }
  }

  // If we somehow ended up with empty content, provide a fallback
  if (!formattedContent.trim()) {
    formattedContent = `## Phân tích\n\n${content}`;
  }

  return formattedContent;
}

/**
 * Safely parse JSON with fallbacks
 */
export function safeJsonParse(text: string) {
  try {
    // Try to parse as is first
    return JSON.parse(text);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    try {
      // Try to fix common JSON issues
      // 1. Find JSON-like structure within the text (between { and })
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e2) {
      // If that fails too, try to extract key parts manually
      const currentSituationMatch = text.match(/"currentSituation"\s*:\s*"([^"]*)"/);
      const expertExplanationMatch = text.match(/"expertExplanation"\s*:\s*"([^"]*)"/);
      const recommendationsMatch = text.match(/"recommendations"\s*:\s*"([^"]*)"/);

      if (currentSituationMatch || expertExplanationMatch || recommendationsMatch) {
        return {
          currentSituation: currentSituationMatch ? currentSituationMatch[1] : "",
          expertExplanation: expertExplanationMatch ? expertExplanationMatch[1] : "",
          recommendations: recommendationsMatch ? recommendationsMatch[1] : ""
        };
      }
    }
  }

  // If all parsing attempts fail, create a structured object from the raw text
  return {
    currentSituation: "Không thể phân tích dữ liệu JSON. Dưới đây là nội dung gốc:",
    expertExplanation: text.substring(0, Math.min(text.length, 1000)),
    recommendations: "Vui lòng thử lại sau hoặc liên hệ hỗ trợ."
  };
}

/**
 * Format JSON response into markdown
 */
export function formatJsonToMarkdown(jsonData: any): string {
  let formattedContent = '';

  if (jsonData.currentSituation) {
    formattedContent += `## Tình hình hiện tại\n\n${jsonData.currentSituation}\n\n`;
  }

  if (jsonData.expertExplanation) {
    formattedContent += `## Giải thích của chuyên gia\n\n${jsonData.expertExplanation}\n\n`;
  }

  if (jsonData.recommendations) {
    formattedContent += `## Khuyến nghị của chuyên gia\n\n${jsonData.recommendations}\n\n`;
  }

  return formattedContent;
}
