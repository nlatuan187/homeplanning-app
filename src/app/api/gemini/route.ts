import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Model for Intermediate Analysis (Fast, Efficient)
const flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

// Model for Final Report Narrative (Advanced Reasoning)
const proModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-04-17" });

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const {
      comparisonData,
      userContext,
      reportType,
      confirmedYearData,
      loanSummary,
      sectionTopic
    } = body;

    // Validate required data based on report type
    if (reportType === "intermediate" && (!comparisonData || !userContext)) {
      return new NextResponse("Missing required data for intermediate analysis", { status: 400 });
    }

    if (reportType === "final" && (!confirmedYearData || !userContext || !loanSummary || !sectionTopic)) {
      return new NextResponse("Missing required data for final report", { status: 400 });
    }

    // Determine which model to use based on the report type
    const model = reportType === "final" ? proModel : flashModel;

    // Create a prompt for the Gemini model
    let prompt = "";
    let responseSchema = null;

    if (reportType === "intermediate") {
      // Intermediate analysis prompt (using flash model)
      const viableYears = comparisonData.viableYears.map((y: { year: number }) => y.year).join(", ");

      // Create a markdown table for the comparison data
      let comparisonTable = "| Năm | Thu nhập hàng tháng (Triệu VND) | Khoản trả góp (Triệu VND) | Khoản dư (Triệu VND) |\n";
      comparisonTable += "|---|---|---|---|\n";

      comparisonData.viableYears.forEach((year: { year: number, monthlySurplus: number, monthlyPayment: number, buffer: number }) => {
        comparisonTable += `| ${year.year} | ${Math.round(year.monthlySurplus)} | ${Math.round(year.monthlyPayment)} | ${Math.round(year.buffer)} |\n`;
      });

      prompt = `
      System Instruction: You are a helpful Vietnamese financial planning assistant specializing in first-time homebuyers. Analyze the following data objectively and provide insights in markdown format.

      User Context: The user wants to buy their first home (${userContext.targetHouseType} in ${userContext.targetLocation}). Their initial goal was to buy in ${userContext.targetYear - new Date().getFullYear()} years. Projections indicate financial viability starting from year ${comparisonData.viableYears[0].year}.

      Comparison Data:
      ${comparisonTable}

      Task: Analyze the trade-offs for the user choosing between these years (${viableYears}). Address the following in Vietnamese:
      1. **Financial Buffer & Risk:** Evaluate the safety level of the 'Buffer' each year. Discuss the risk associated with a smaller buffer (e.g., vulnerability to unexpected events like job loss, emergencies - mention VUCA briefly).
      2. **Lifestyle Impact:** Compare how buying earlier versus later might impact discretionary spending (travel, shopping, non-essentials), assuming the required surplus must be maintained.
      3. **Goal Alignment & Market Factors:** Discuss how each option aligns with the user's original timeline. Briefly mention the trade-off between buying sooner (potentially lower price but tighter budget) vs. later (potentially higher price due to appreciation but potentially more savings/income growth).

      Keep the analysis concise and focused on helping the user make an informed decision between the viable years.
      `;

      // Define schema for intermediate analysis
      responseSchema = {
        type: "object",
        properties: {
          financialBufferAnalysis: {
            type: "string",
            description: "Analysis of the financial buffer and associated risks for each viable year"
          },
          lifestyleImpactAnalysis: {
            type: "string",
            description: "Analysis of how buying in each viable year might impact lifestyle and discretionary spending"
          },
          goalAlignmentAnalysis: {
            type: "string",
            description: "Analysis of how each viable year aligns with the user's original timeline and market factors"
          },
          recommendation: {
            type: "string",
            description: "Overall recommendation based on the analysis"
          }
        },
        required: ["financialBufferAnalysis", "lifestyleImpactAnalysis", "goalAlignmentAnalysis", "recommendation"]
      };
    } else if (reportType === "final") {
      // Final report narrative prompt (using pro model)
      const confirmedYear = userContext.confirmedPurchaseYear;
      const buffer = confirmedYearData.buffer;
      const isAffordable = buffer >= 0;

      // Create different prompts based on the section topic
      switch (sectionTopic) {
        case "assetEfficiency":
          prompt = `
          System Instruction: You are Finful, an expert Vietnamese financial planning advisor providing detailed, thoughtful analysis for a first-time homebuyer's personalized plan. Write the requested report section comprehensively and encouragingly in Vietnamese, using markdown for formatting.

          User Context: User is ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, planning to buy a home. They have reviewed projections and chosen to target year ${confirmedYear} for their purchase.

          Section Topic: Asset Efficiency (Hiệu quả Danh mục Tài sản)

          Data for Confirmed Purchase Year ${confirmedYear}:
          * Accumulated Savings (Số tiền tích lũy): ${Math.round(confirmedYearData.cumulativeSavings)} triệu VNĐ
          * Target House Price (Giá nhà năm đó): ${Math.round(confirmedYearData.housePriceProjected)} triệu VNĐ
          * Savings Percentage (Tỷ lệ Vốn tự có/Giá nhà): ${Math.round(loanSummary.downPaymentPercentage)}%
          * Investment Return Assumption (Tỷ suất đầu tư giả định): ${userContext.pctInvestmentReturn}%
          * Monthly Buffer (Khoản dư hàng tháng): ${Math.round(confirmedYearData.buffer)} triệu VNĐ
          * Is Affordable: ${isAffordable ? "Yes" : "No"}

          ${!isAffordable ? `
          Important: The current plan is NOT financially feasible because the buffer is negative (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
          Include specific recommendations to make the plan feasible, such as:
          - Increasing other income sources (family support, side jobs)
          - Getting married sooner if not already married
          - Postponing having children if applicable
          - Reducing the target house price
          - Increasing income and investment returns
          - Reducing monthly expenses
          - In the worst case, considering renting while working on these factors
          ` : ""}

          Task: Write the 'Asset Efficiency' section for their plan targeting year ${confirmedYear}. Thoroughly analyze and explain:
          1. Their projected savings position by ${confirmedYear} relative to the house price.
          2. The significance of achieving the assumed ${userContext.pctInvestmentReturn}% investment return annually. Elaborate on why this rate is necessary (outpacing ${userContext.pctHouseGrowth}% house price growth) and what achieving it might entail (consistent saving, appropriate investment strategy). Reinforce this is a key lever for the plan's success.
          3. The Buffer strategy: Detail the monthly buffer of ${Math.round(confirmedYearData.buffer)} triệu amount, explain its 'safety first' purpose, how it buffers against risk, and why it's important to maintain this buffer.
          4. Conclude with an encouraging summary of this aspect of their plan for year ${confirmedYear}.
          5. Output must be in Vietnamese markdown.
          `;
          break;

        case "cashFlow":
          prompt = `
          System Instruction: You are Finful, an expert Vietnamese financial planning advisor providing detailed, thoughtful analysis for a first-time homebuyer's personalized plan. Write the requested report section comprehensively and encouragingly in Vietnamese, using markdown for formatting.

          User Context: User is ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, planning to buy a home. They have reviewed projections and chosen to target year ${confirmedYear} for their purchase.

          Section Topic: Cash Flow Management (Quản lý Dòng tiền)

          Data for Confirmed Purchase Year ${confirmedYear}:
          * Monthly Income (Thu nhập hàng tháng): ${Math.round(confirmedYearData.annualIncome / 12)} triệu VNĐ
          * Monthly Expenses (Chi phí hàng tháng): ${Math.round(confirmedYearData.annualExpenses / 12)} triệu VNĐ
          * Monthly Surplus (Tiết kiệm hàng tháng): ${Math.round(confirmedYearData.monthlySurplus)} triệu VNĐ
          * Monthly Mortgage Payment (Khoản trả góp): ${Math.round(confirmedYearData.monthlyPayment)} triệu VNĐ
          * Payment to Income Ratio (Tỷ lệ Trả góp/Thu nhập): ${Math.round(loanSummary.paymentToIncomeRatio)}%
          * Monthly Buffer (Khoản dư hàng tháng): ${Math.round(confirmedYearData.buffer)} triệu VNĐ
          * Is Affordable: ${isAffordable ? "Yes" : "No"}

          ${!isAffordable ? `
          Important: The current plan is NOT financially feasible because the buffer is negative (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
          Include specific recommendations to make the plan feasible, such as:
          - Increasing other income sources (family support, side jobs)
          - Getting married sooner if not already married
          - Postponing having children if applicable
          - Reducing the target house price
          - Increasing income and investment returns
          - Reducing monthly expenses
          - In the worst case, considering renting while working on these factors
          ` : ""}

          Task: Write the 'Cash Flow Management' section for their plan targeting year ${confirmedYear}. Thoroughly analyze and explain:
          1. The projected monthly cash flow in ${confirmedYear}, including income, expenses, and surplus.
          2. The impact of the mortgage payment on their monthly budget and how it compares to standard affordability guidelines.
          3. Strategies for maintaining and potentially improving their cash flow position.
          4. Conclude with practical advice for managing their cash flow effectively.
          5. Output must be in Vietnamese markdown.
          `;
          break;

        case "riskManagement":
          prompt = `
          System Instruction: You are Finful, an expert Vietnamese financial planning advisor providing detailed, thoughtful analysis for a first-time homebuyer's personalized plan. Write the requested report section comprehensively and encouragingly in Vietnamese, using markdown for formatting.

          User Context: User is ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, planning to buy a home. They have reviewed projections and chosen to target year ${confirmedYear} for their purchase.

          Section Topic: Risk Management (Quản trị Rủi ro)

          Data for Confirmed Purchase Year ${confirmedYear}:
          * Buffer Amount (Khoản dư): ${Math.round(confirmedYearData.buffer)} triệu VNĐ/tháng
          * Buffer Percentage (Tỷ lệ Đệm): ${Math.round(loanSummary.bufferPercentage)}% của khoản trả góp
          * Emergency Fund (Quỹ khẩn cấp): ${Math.round(confirmedYearData.targetEF)} triệu VNĐ
          * Loan to Value Ratio (Tỷ lệ Vay/Giá trị): ${Math.round(confirmedYearData.ltvRatio)}%
          * Is Affordable: ${isAffordable ? "Yes" : "No"}

          ${!isAffordable ? `
          Important: The current plan is NOT financially feasible because the buffer is negative (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
          Include specific recommendations to make the plan feasible, such as:
          - Increasing other income sources (family support, side jobs)
          - Getting married sooner if not already married
          - Postponing having children if applicable
          - Reducing the target house price
          - Increasing income and investment returns
          - Reducing monthly expenses
          - In the worst case, considering renting while working on these factors
          ` : ""}

          Task: Write the 'Risk Management' section for their plan targeting year ${confirmedYear}. Thoroughly analyze and explain:
          1. The importance of their emergency fund and how it provides financial security.
          2. The significance of their buffer amount and how it protects against financial stress.
          3. Potential risks they should be aware of and strategies to mitigate them.
          4. Insurance considerations and other protective measures they should consider.
          5. Output must be in Vietnamese markdown.
          `;
          break;

        case "timeline":
          prompt = `
          System Instruction: You are Finful, an expert Vietnamese financial planning advisor providing detailed, thoughtful analysis for a first-time homebuyer's personalized plan. Write the requested report section comprehensively and encouragingly in Vietnamese, using markdown for formatting.

          User Context: User is ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, planning to buy a home. They have reviewed projections and chosen to target year ${confirmedYear} for their purchase.

          Section Topic: Timeline & Milestones (Lộ trình & Cột mốc)

          Data for Confirmed Purchase Year ${confirmedYear}:
          * Current Year: ${new Date().getFullYear()}
          * Years Until Purchase: ${confirmedYear - new Date().getFullYear()}
          * Original Target Year: ${userContext.targetYear}
          * Marriage Plans: ${userContext.plansMarriageBeforeTarget ? `Dự định kết hôn vào năm ${userContext.targetMarriageYear}` : "Không có kế hoạch kết hôn trước khi mua nhà"}
          * Child Plans: ${userContext.plansChildBeforeTarget ? `Dự định có con vào năm ${userContext.targetChildYear}` : "Không có kế hoạch có con trước khi mua nhà"}
          * Is Affordable: ${isAffordable ? "Yes" : "No"}

          ${!isAffordable ? `
          Important: The current plan is NOT financially feasible because the buffer is negative (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
          Include specific recommendations to make the plan feasible, such as:
          - Increasing other income sources (family support, side jobs)
          - Getting married sooner if not already married
          - Postponing having children if applicable
          - Reducing the target house price
          - Increasing income and investment returns
          - Reducing monthly expenses
          - In the worst case, considering renting while working on these factors
          ` : ""}

          Task: Write the 'Timeline & Milestones' section for their plan targeting year ${confirmedYear}. Thoroughly analyze and explain:
          1. A clear timeline from now until the purchase year, including key financial milestones.
          2. How life events (marriage, children) align with or impact the home purchase timeline.
          3. Specific actions they should take each year leading up to the purchase.
          4. A visual representation of the timeline (described in text that could be converted to a timeline).
          5. Output must be in Vietnamese markdown.
          `;
          break;

        case "recommendations":
          prompt = `
          System Instruction: You are Finful, an expert Vietnamese financial planning advisor providing detailed, thoughtful analysis for a first-time homebuyer's personalized plan. Write the requested report section comprehensively and encouragingly in Vietnamese, using markdown for formatting.

          User Context: User is ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, planning to buy a home. They have reviewed projections and chosen to target year ${confirmedYear} for their purchase.

          Section Topic: Recommendations & Next Steps (Khuyến nghị & Bước tiếp theo)

          Data for Confirmed Purchase Year ${confirmedYear}:
          * All previously analyzed data for year ${confirmedYear}
          * Current Savings: ${Math.round(confirmedYearData.cumulativeSavings)} triệu VNĐ
          * Target House Price: ${Math.round(confirmedYearData.housePriceProjected)} triệu VNĐ
          * Monthly Payment: ${Math.round(confirmedYearData.monthlyPayment)} triệu VNĐ
          * Monthly Buffer: ${Math.round(confirmedYearData.buffer)} triệu VNĐ
          * Is Affordable: ${isAffordable ? "Yes" : "No"}

          ${!isAffordable ? `
          Important: The current plan is NOT financially feasible because the buffer is negative (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
          Include specific recommendations to make the plan feasible, such as:
          - Increasing other income sources (family support, side jobs)
          - Getting married sooner if not already married
          - Postponing having children if applicable
          - Reducing the target house price
          - Increasing income and investment returns
          - Reducing monthly expenses
          - In the worst case, considering renting while working on these factors
          ` : ""}

          Task: Write the 'Recommendations & Next Steps' section for their plan targeting year ${confirmedYear}. Thoroughly provide:
          1. 3-5 specific, actionable recommendations to improve their financial position.
          2. Clear next steps they should take immediately, in the short term, and in the long term.
          3. Potential optimizations to their current plan that could improve outcomes.
          4. Resources or tools they might consider using to help implement these recommendations.
          5. A motivating conclusion that reinforces the achievability of their home purchase goal.
          6. Output must be in Vietnamese markdown.
          `;
          break;

        default:
          prompt = `
          System Instruction: You are Finful, an expert Vietnamese financial planning advisor providing detailed, thoughtful analysis for a first-time homebuyer's personalized plan. Write the requested report section comprehensively and encouragingly in Vietnamese, using markdown for formatting.

          User Context: User is ${userContext.maritalStatus}, ${userContext.hasDependents ? "có người phụ thuộc" : "không có người phụ thuộc"}, planning to buy a home. They have reviewed projections and chosen to target year ${confirmedYear} for their purchase.

          Section Topic: General Analysis (Phân tích Tổng quan)

          Data for Confirmed Purchase Year ${confirmedYear}:
          * All key financial metrics for year ${confirmedYear}
          * Is Affordable: ${isAffordable ? "Yes" : "No"}

          ${!isAffordable ? `
          Important: The current plan is NOT financially feasible because the buffer is negative (${Math.round(confirmedYearData.buffer)} triệu VNĐ). 
          Include specific recommendations to make the plan feasible, such as:
          - Increasing other income sources (family support, side jobs)
          - Getting married sooner if not already married
          - Postponing having children if applicable
          - Reducing the target house price
          - Increasing income and investment returns
          - Reducing monthly expenses
          - In the worst case, considering renting while working on these factors
          ` : ""}

          Task: Write a general analysis section for their plan targeting year ${confirmedYear}. Provide a comprehensive overview of their financial situation and home purchase plan. Output must be in Vietnamese markdown.
          `;
      }

      // Define schema for final report sections
      responseSchema = {
        type: "object",
        properties: {
          currentSituation: {
            type: "string",
            description: "Analysis of the current financial situation related to this section"
          },
          expertExplanation: {
            type: "string",
            description: "Expert explanation of key concepts and implications"
          },
          recommendations: {
            type: "string",
            description: "Specific recommendations and advice related to this section"
          }
        },
        required: ["currentSituation", "expertExplanation", "recommendations"]
      };
    } else {
      // Default to intermediate analysis if reportType is not specified
      prompt = `
      Analyze the following financial data for a home buyer in Vietnam and provide personalized advice.

      User Context:
      ${JSON.stringify(userContext, null, 2)}

      Comparison Data for Viable Years:
      ${JSON.stringify(comparisonData, null, 2)}

      Please provide a detailed analysis of the trade-offs for each viable year, considering:
      1. Financial risk and buffer implications
      2. Lifestyle sacrifices
      3. Housing market trends
      4. Personal life events (marriage, children, etc.)
      5. Specific recommendations for the user's situation

      Format your response in Vietnamese, with clear sections and bullet points where appropriate.
      `;

      // Default schema
      responseSchema = {
        type: "object",
        properties: {
          analysis: {
            type: "string",
            description: "General financial analysis"
          },
          recommendations: {
            type: "string",
            description: "Specific recommendations"
          }
        },
        required: ["analysis", "recommendations"]
      };
    }

    // Set generation config based on report type
    const generationConfig = reportType === "final"
      ? { temperature: 0.3, maxOutputTokens: 1500 }
      : { temperature: 0.2, maxOutputTokens: 1000 };

    // Call the Gemini API with the appropriate model and schema
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      ...(responseSchema && {
        config: {
          responseMimeType: 'application/json',
          responseSchema
        }
      })
    });

    const response = result.response;
    const text = response.text();

    // Parse the JSON response if using schema
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(text);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_) {
      // If parsing fails, use the raw text
      parsedResponse = { analysis: text };
    }

    return NextResponse.json({
      analysis: text,
      structured: parsedResponse,
      reportType: reportType || "default",
      sectionTopic: sectionTopic || "general"
    });
  } catch (error) {
    console.error("[GEMINI_API]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
