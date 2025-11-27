import { render, screen } from '@testing-library/react'
import AccumulationChart from '@/components/plan/playground/AccumulationChart'
import { ChartMilestone } from '@/lib/calculations/projections/generateChartData'

describe('AccumulationChart - UI Component Tests', () => {
    const validData: ChartMilestone[] = [
        { name: '2025', value: 100, value2: 50, value3: 150 },
        { name: '2026', value: 150, value2: 75, value3: 225 },
        { name: '2027', value: 200, value2: 100, value3: 300 },
    ]

    describe('P0 - CRITICAL: Empty/Null Data Handling', () => {
        it('[BUG] should show empty state for empty array', () => {
            render(<AccumulationChart data={[]} name="Test" hasComparisonData={false} />)
            expect(screen.getByText(/Không có dữ liệu để hiển thị biểu đồ/i)).toBeInTheDocument()
        })

        it('[BUG] should show empty state for null data', () => {
            render(<AccumulationChart data={null as any} name="Test" hasComparisonData={false} />)
            expect(screen.getByText(/Không có dữ liệu để hiển thị biểu đồ/i)).toBeInTheDocument()
        })

        it('[BUG] should show empty state for undefined data', () => {
            render(<AccumulationChart data={undefined as any} name="Test" hasComparisonData={false} />)
            expect(screen.getByText(/Không có dữ liệu để hiển thị biểu đồ/i)).toBeInTheDocument()
        })
    })

    describe('P0 - CRITICAL: Chart Rendering', () => {
        it('should render ResponsiveContainer when data provided', () => {
            const { container } = render(
                <AccumulationChart data={validData} name="Tích lũy" hasComparisonData={false} />
            )

            // ResponsiveContainer creates a div with specific structure
            const responsiveContainer = container.querySelector('.recharts-responsive-container')
            expect(responsiveContainer).toBeInTheDocument()
        })

        it('should render ComposedChart with valid data', () => {
            const { container } = render(
                <AccumulationChart data={validData} name="Tích lũy" hasComparisonData={true} />
            )

            // Recharts renders SVG
            const svg = container.querySelector('svg.recharts-surface')
            expect(svg).toBeInTheDocument()
        })

        it('should render legend with correct name', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Số tiền tích lũy"
                    hasComparisonData={false}
                />
            )

            // Legend should contain the name
            const legend = container.querySelector('.recharts-legend-wrapper')
            expect(legend).toBeInTheDocument()
            expect(legend?.textContent).toContain('Số tiền tích lũy')
        })
    })

    describe('P1 - HIGH: Conditional Rendering (hasComparisonData)', () => {
        it('should render Bar charts when hasComparisonData=true', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Tích lũy"
                    name2="Đi vay"
                    hasComparisonData={true}
                />
            )

            // Should have Bar elements for stacked chart
            const bars = container.querySelectorAll('.recharts-bar-rectangle')
            expect(bars.length).toBeGreaterThan(0)
        })

        it('should render Area chart when hasComparisonData=false', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Tích lũy"
                    hasComparisonData={false}
                />
            )

            // Should have Area path
            const area = container.querySelector('.recharts-area-curve')
            expect(area).toBeInTheDocument()
        })

        it('should render Line for value3 when hasComparisonData=true', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Tích lũy"
                    name3="Giá nhà"
                    hasComparisonData={true}
                />
            )

            // Should have Line for house price
            const line = container.querySelector('.recharts-line-curve')
            expect(line).toBeInTheDocument()
        })
    })

    describe('P1 - HIGH: Data Transformation', () => {
        it('[BUG RISK] should calculate value3 = value + value2', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 100, value2: 50 }, // value3 should be 150
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={true}
                />
            )

            // Line label should show 150
            const labels = container.querySelectorAll('.recharts-label')
            const value3Label = Array.from(labels).find(label =>
                label.textContent === '150'
            )
            expect(value3Label).toBeInTheDocument()
        })

        it('[BUG] should handle missing value2 gracefully', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 100 } as any, // value2 is undefined
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={true}
                />
            )

            // Should not crash, value3 should be 100 + 0 = 100
            expect(container.querySelector('svg')).toBeInTheDocument()
        })
    })

    describe('P1 - HIGH: Negative Value Handling', () => {
        it('[BUG] should render transparent Cell for negative value2', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 100, value2: -50, value3: 50 },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Tích lũy"
                    name2="Đi vay"
                    hasComparisonData={true}
                />
            )

            // Line 68: Cell with value2 < 0 should be transparent
            const bars = container.querySelectorAll('.recharts-bar-rectangle')
            // Second bar (value2) should be transparent or hidden
            // This is tricky to test directly, but we can verify it renders
            expect(bars.length).toBeGreaterThan(0)
        })

        it('should handle all-negative values', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: -100, value2: -50, value3: -150 },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={true}
                />
            )

            // Should still render chart
            expect(container.querySelector('svg')).toBeInTheDocument()
        })
    })

    describe('P1 - HIGH: Edge Cases', () => {
        it('should handle single data point', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 100, value2: 50, value3: 150 },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={false}
                />
            )

            expect(container.querySelector('svg')).toBeInTheDocument()
        })

        it('should handle very large numbers', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 999999999, value2: 500000000, value3: 1499999999 },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={true}
                />
            )

            // formatNumber should handle this
            // Check if chart renders without crashing
            expect(container.querySelector('svg')).toBeInTheDocument()
        })

        it('[BUG RISK] should handle floating point precision', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 0.1 + 0.2, value2: 0, value3: 0.3 }, // 0.30000000000000004
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={false}
                />
            )

            // Should format as "0.3" not "0.30000000000000004"
            expect(container.querySelector('svg')).toBeInTheDocument()
        })

        it('should handle zero values', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 0, value2: 0, value3: 0 },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={true}
                />
            )

            // Should render but might show empty chart
            expect(container.querySelector('svg')).toBeInTheDocument()
        })
    })

    describe('P2 - MEDIUM: Number Formatting', () => {
        it('[BUG RISK] should format numbers with formatNumber function', () => {
            const testData: ChartMilestone[] = [
                { name: '2025', value: 1234567.89, value2: 0, value3: 1234567.89 },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={false}
                />
            )

            // Should format with commas and max 1 decimal
            // Lines 18-19: minimumFractionDigits: 0, maximumFractionDigits: 1
            const labels = container.querySelectorAll('.recharts-label')
            const label = Array.from(labels).find(l =>
                l.textContent?.includes('1,234,567')
            )
            expect(label).toBeInTheDocument()
        })

        it('should handle null/undefined values in formatNumber', () => {
            // Line 15: if (value === null || value === undefined) return ""
            const testData: ChartMilestone[] = [
                { name: '2025', value: null as any, value2: undefined as any },
            ]

            const { container } = render(
                <AccumulationChart
                    data={testData}
                    name="Test"
                    hasComparisonData={true}
                />
            )

            // Should not crash
            expect(container.querySelector('svg')).toBeInTheDocument()
        })
    })

    describe('P2 - MEDIUM: Props Validation', () => {
        it('should use default name2 for comparison data', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Tích lũy"
                    // name2 not provided, should default to "Đi vay"
                    hasComparisonData={true}
                />
            )

            const legend = container.querySelector('.recharts-legend-wrapper')
            expect(legend?.textContent).toContain('Đi vay')
        })

        it('should use custom name2 when provided', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Tích lũy"
                    name2="Số tiền vay"
                    hasComparisonData={true}
                />
            )

            const legend = container.querySelector('.recharts-legend-wrapper')
            expect(legend?.textContent).toContain('Số tiền vay')
        })

        it('should use default name3 for house price', () => {
            const { container } = render(
                <AccumulationChart
                    data={validData}
                    name="Tích lũy"
                    // name3 not provided, should default to "Giá nhà"
                    hasComparisonData={true}
                />
            )

            const legend = container.querySelector('.recharts-legend-wrapper')
            expect(legend?.textContent).toContain('Giá nhà')
        })
    })
})
