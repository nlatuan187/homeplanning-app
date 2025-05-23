"use client";

import React, { useEffect, useState } from 'react'; // useRef removed as module-level ref is used for ReactFCref

interface ChartConfigs {
  type: string;
  width: string;
  height: string;
  dataFormat: string;
  dataSource: unknown; 
  [key: string]: unknown;
}

interface ClientOnlyFusionChartProps {
  chartConfigs: ChartConfigs;
}

let ReactFCref: any = null; 
let fusionChartsInitialized = false;

const ClientOnlyFusionChart: React.FC<ClientOnlyFusionChartProps> = ({ chartConfigs }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeChart = async () => {
      if (typeof window !== 'undefined' && !fusionChartsInitialized) {
        try {
          const ReactFCModule = await import('react-fusioncharts');
          const FusionChartsCore = (await import('fusioncharts')).default;
          const Widgets = (await import('fusioncharts/fusioncharts.widgets')).default;
          const FusionTheme = (await import('fusioncharts/themes/fusioncharts.theme.fusion')).default;

          ReactFCref = ReactFCModule.default;

          if (Widgets && typeof Widgets === 'function') {
            Widgets(FusionChartsCore);
          } else if (FusionChartsCore && typeof (FusionChartsCore as any).addDep === 'function') {
              (FusionChartsCore as any).addDep(Widgets);
          } else {
              console.warn("FusionCharts Widgets module could not be registered.");
          }

          if (FusionTheme && typeof FusionTheme === 'function') {
            FusionTheme(FusionChartsCore);
          } else if (FusionChartsCore && typeof (FusionChartsCore as any).addDep === 'function') {
              (FusionChartsCore as any).addDep(FusionTheme);
          } else {
              console.warn("FusionCharts FusionTheme module could not be registered.");
          }
          
          if (ReactFCref && typeof ReactFCref.fcRoot === 'function') {
              ReactFCref.fcRoot(FusionChartsCore, Widgets, FusionTheme);
              fusionChartsInitialized = true; 
              setIsReady(true);
          } else {
            console.error("ReactFC.fcRoot is not available. FusionCharts may not work correctly.");
            setIsReady(false); 
          }
        } catch (error) {
          console.error("Error initializing FusionCharts:", error);
          setIsReady(false); 
        }
      } else if (fusionChartsInitialized) {
        if (!ReactFCref && typeof window !== 'undefined') { 
            import('react-fusioncharts').then(mod => {
                ReactFCref = mod.default;
                // fcRoot should have been called already if fusionChartsInitialized is true
                setIsReady(true);
            });
        } else {
             setIsReady(true);
        }
      }
    };
    initializeChart();
  }, []); 

  if (!isReady || !ReactFCref) {
    return <div className="flex justify-center items-center w-full h-full"><p>Loading Chart...</p></div>;
  }

  const ChartComponent = ReactFCref;
  return <ChartComponent {...chartConfigs} />;
};

export default ClientOnlyFusionChart;
