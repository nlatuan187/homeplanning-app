"use client";

import { Plan } from "@prisma/client";
import { useRouter } from "next/navigation"; // Correct hook for App Router
import { Button } from "@/components/ui/button";
import Image from "next/image";
import ResultsHeader from "./ResultsHeader";

interface ResultsClientProps {
  plan: Plan & { familySupport: any };
  firstYearProjection?: any;
}

export default function ResultsClient({
  plan,
  firstYearProjection,
}: ResultsClientProps) {
  const router = useRouter();
  const isScenarioA = plan.affordabilityOutcome === "ScenarioA";
  console.log("firstYearProjection", firstYearProjection);
  console.log("plan.firstViableYear", plan.firstViableYear);
  console.log("firstYearProjection.year - plan.firstViableYear", firstYearProjection.year - (plan.firstViableYear || 0));

  return (
    <main className="min-h-screen bg-black text-white p-2 md:p-4">
      <div className="container mx-auto max-w-5xl pb-24">
        <ResultsHeader />

        <div className="rounded-lg text-center text-white pt-10">
          Kế hoạch mua nhà năm {plan.firstViableYear}
        </div>

        <div className="space-y-8">
          {!isScenarioA ? (
            <div>
              <div className="rounded-lg p-4 text-center font-semibold text-2xl text-green-500">
                hoàn toàn khả thi
              </div>
              <div className="my-6 md:my-8">
                <Image
                  src="/onboarding/result1.png"
                  alt="Decorative"
                  width={136}
                  height={169}
                  className="mx-auto"
                />
              </div>
              <div className="rounded-lg py-4 px-7 text-center">
                Chúng tôi có thể giúp bạn tìm ra cách mua được nhà sớm hơn, dễ
                dàng hơn.
                <br />
                Muốn biết chứ?
              </div>
            </div>
          ) : (
            <div>
              <div className="rounded-lg text-center font-semibold text-2xl text-red-500">
                chưa khả thi
              </div>
              {plan.firstViableYear && firstYearProjection.year - plan.firstViableYear === 1 ? (
                <>
                  <div className="rounded-lg p-4 text-center">
                    nhưng bạn có thể mua nhà vào năm {firstYearProjection.year}
                  </div>
                  <div className="my-6 md:my-8 items-center justify-center pt-10">
                    <Image
                    src="/onboarding/result2.png"
                    alt="Decorative"
                      width={136}
                      height={169}
                      className="mx-auto"
                    />
                  </div>
                </>
              ) : (
              <div className="my-6 md:my-8 items-center justify-center pt-10">
                <Image
                  src="/onboarding/result3.png"
                  alt="Decorative"
                  width={136}
                  height={169}
                  className="mx-auto"
                />
              </div>
            )}
              <div className="rounded-lg py-4 px-7 text-center">
                Chúng tôi có thể giúp bạn tìm ra cách mua sớm nhất có thể.
                <br />
                Muốn biết chứ?
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 bg-black p-4">
        <div className="container mx-auto max-w-5xl">
          <Button
            className="w-full bg-white text-black hover:bg-slate-200 text-base md:text-lg font-semibold py-3 rounded-sm"
            onClick={() => router.push(`/plan/${plan.id}/familysupport`)}
          >
            Khám phá ngay
          </Button>
        </div>
      </div>
    </main>
  );
}
