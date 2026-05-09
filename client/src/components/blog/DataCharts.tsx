import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Award, School } from "lucide-react";

const districtPerformanceData = [
  { district: "D26", ela: 70.4, math: 73.1, location: "Queens" },
  { district: "D20", ela: 64.6, math: 68.0, location: "Brooklyn" },
  { district: "D25", ela: 62.4, math: 64.6, location: "Queens" },
  { district: "D2", ela: 60.9, math: 60.1, location: "Manhattan" },
  { district: "D28", ela: 60.4, math: 60.8, location: "Queens" },
  { district: "D31", ela: 60.1, math: 59.8, location: "Staten Island" },
  { district: "D15", ela: 59.7, math: 58.2, location: "Brooklyn" },
  { district: "D30", ela: 59.3, math: 60.3, location: "Queens" },
  { district: "D12", ela: 43.0, math: 41.2, location: "Bronx" },
  { district: "D9", ela: 41.8, math: 39.5, location: "Bronx" },
];

const proficiencyTierData = [
  { name: "High (80%+)", value: 130, color: "#10b981" },
  { name: "Medium (60-79%)", value: 308, color: "#eab308" },
  { name: "Low (40-59%)", value: 801, color: "#f97316" },
  { name: "Very Low (<40%)", value: 294, color: "#ef4444" },
];

const economicImpactData = [
  { district: "D26", eni: 54, ela: 70.4, borough: "Queens" },
  { district: "D2", eni: 42, ela: 60.9, borough: "Manhattan" },
  { district: "D31", eni: 62, ela: 60.1, borough: "Staten Island" },
  { district: "D3", eni: 55, ela: 56.8, borough: "Manhattan" },
  { district: "D19", eni: 87, ela: 48.0, borough: "Brooklyn" },
  { district: "D10", eni: 86, ela: 47.1, borough: "Bronx" },
  { district: "D7", eni: 92, ela: 46.7, borough: "Bronx" },
  { district: "D12", eni: 92, ela: 43.0, borough: "Bronx" },
  { district: "D9", eni: 92, ela: 41.8, borough: "Bronx" },
];

const gtComparisonData = [
  { category: "Schools with G&T", ela: 65.0, math: 66.3, count: 130 },
  { category: "Schools without G&T", ela: 52.0, math: 51.4, count: 1403 },
];

const COLORS = ["#10b981", "#eab308", "#f97316", "#ef4444"];

export function DistrictPerformanceChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-district">
          Top & Bottom Performing Districts by ELA Proficiency
        </CardTitle>
        <CardDescription>
          Comparing the 8 highest and 2 lowest performing districts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={districtPerformanceData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="district" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value}%`, '']}
                labelFormatter={(label) => {
                  const item = districtPerformanceData.find(d => d.district === label);
                  return `${label} (${item?.location})`;
                }}
              />
              <Legend />
              <Bar dataKey="ela" name="ELA %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="math" name="Math %" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProficiencyTierChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-proficiency">
          NYC Schools by ELA Proficiency Level
        </CardTitle>
        <CardDescription>
          Distribution of 1,533 schools across proficiency tiers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={proficiencyTierData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {proficiencyTierData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} schools`, '']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function EconomicImpactChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-economic">
          Economic Need Index vs. Academic Performance
        </CardTitle>
        <CardDescription>
          Higher economic need strongly correlates with lower test scores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="eni" 
                name="Economic Need Index" 
                domain={[30, 100]}
                tick={{ fontSize: 12 }}
                label={{ value: 'Economic Need Index (%)', position: 'bottom', offset: 0 }}
              />
              <YAxis 
                dataKey="ela" 
                name="ELA Proficiency" 
                domain={[30, 80]}
                tick={{ fontSize: 12 }}
                label={{ value: 'ELA Proficiency (%)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [
                  `${value}%`, 
                  name === 'ela' ? 'ELA Score' : 'ENI'
                ]}
                labelFormatter={(_, payload) => {
                  if (payload && payload[0]) {
                    const data = payload[0].payload;
                    return `${data.district} (${data.borough})`;
                  }
                  return '';
                }}
              />
              <Scatter 
                data={economicImpactData} 
                fill="#3b82f6"
                shape="circle"
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Each dot represents a district. Districts with higher economic need (right) tend to have lower ELA scores (bottom).
        </p>
      </CardContent>
    </Card>
  );
}

export function GTComparisonChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-gt">
          Gifted & Talented Program Impact on Scores
        </CardTitle>
        <CardDescription>
          Schools with G&T programs show significantly higher proficiency rates
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={gtComparisonData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" domain={[0, 80]} tick={{ fontSize: 12 }} />
              <YAxis 
                dataKey="category" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
              />
              <Legend />
              <Bar dataKey="ela" name="ELA %" fill="#10b981" radius={[0, 4, 4, 0]} />
              <Bar dataKey="math" name="Math %" fill="#06b6d4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-8 mt-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-emerald-600">+13%</div>
            <div className="text-muted-foreground">Higher ELA</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-cyan-600">+15%</div>
            <div className="text-muted-foreground">Higher Math</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function KeyStatsCards() {
  const stats = [
    { label: "Schools Analyzed", value: "1,533", color: "text-primary" },
    { label: "Avg. ELA Proficiency", value: "53.2%", color: "text-orange-600" },
    { label: "Avg. Math Proficiency", value: "52.7%", color: "text-orange-600" },
    { label: "Avg. Climate Score", value: "91.0%", color: "text-emerald-600" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {stat.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// COVID Recovery Blog Charts
interface CovidRecoveryData {
  citywideYearlyTrends: Array<{
    year: number;
    schoolCount: number;
    avgEla: number;
    avgMath: number;
  }>;
  districtRecovery: Array<{
    district: number;
    ela2022: number;
    ela2025: number;
    elaChange: number;
    math2022: number;
    math2025: number;
    mathChange: number;
    avgChange: number;
  }>;
  topImprovedSchools: Array<{
    name: string;
    dbn: string;
    borough: string;
    ela2022: number;
    ela2025: number;
    elaChange: number;
    math2022: number;
    math2025: number;
    mathChange: number;
    totalChange: number;
  }>;
}

export function useCovidRecoveryData() {
  return useQuery<CovidRecoveryData>({
    queryKey: ["/api/blog/covid-recovery-data"],
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function CovidRecoveryStatsCards() {
  const { data, isLoading } = useCovidRecoveryData();
  
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const trend2019 = data.citywideYearlyTrends.find(t => t.year === 2019);
  const trend2022 = data.citywideYearlyTrends.find(t => t.year === 2022);
  const trend2025 = data.citywideYearlyTrends.find(t => t.year === 2025);

  const stats = [
    { 
      label: "2025 ELA Proficiency", 
      value: `${trend2025?.avgEla}%`, 
      subtext: `+${((trend2025?.avgEla || 0) - (trend2019?.avgEla || 0)).toFixed(1)}% vs 2019`,
      color: "text-emerald-600" 
    },
    { 
      label: "2025 Math Proficiency", 
      value: `${trend2025?.avgMath}%`, 
      subtext: `+${((trend2025?.avgMath || 0) - (trend2019?.avgMath || 0)).toFixed(1)}% vs 2019`,
      color: "text-emerald-600" 
    },
    { 
      label: "Math COVID Drop", 
      value: `-${((trend2019?.avgMath || 0) - (trend2022?.avgMath || 0)).toFixed(1)}%`, 
      subtext: "2019 → 2022",
      color: "text-red-600" 
    },
    { 
      label: "Schools Analyzed", 
      value: trend2025?.schoolCount?.toLocaleString() || "1,000+", 
      subtext: "With 2025 data",
      color: "text-primary" 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8" data-testid="covid-recovery-stats">
      {stats.map((stat, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className={`text-2xl md:text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {stat.label}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {stat.subtext}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CitywideRecoveryTrendChart() {
  const { data, isLoading } = useCovidRecoveryData();

  if (isLoading || !data) {
    return (
      <Card className="my-8">
        <CardHeader>
          <CardTitle className="text-lg">Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.citywideYearlyTrends.map(t => ({
    year: t.year,
    ELA: t.avgEla,
    Math: t.avgMath,
  }));

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="chart-title-recovery">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          NYC Citywide Proficiency: The Recovery Arc (2018-2025)
        </CardTitle>
        <CardDescription>
          Average ELA and Math proficiency rates across all NYC schools. Note the COVID gap in 2020-2021.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[30, 70]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value}%`, '']}
              />
              <Legend />
              <ReferenceLine 
                x={2020} 
                stroke="#ef4444" 
                strokeDasharray="5 5" 
                label={{ value: 'COVID', position: 'top', fill: '#ef4444', fontSize: 10 }} 
              />
              <Line 
                type="monotone" 
                dataKey="ELA" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
              <Line 
                type="monotone" 
                dataKey="Math" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function DistrictRecoveryChart() {
  const { data, isLoading } = useCovidRecoveryData();

  if (isLoading || !data) {
    return (
      <Card className="my-8">
        <CardHeader>
          <CardTitle className="text-lg">Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  // Take top 10 and bottom 5 districts
  const topDistricts = data.districtRecovery.slice(0, 10);

  const chartData = topDistricts.map(d => ({
    district: `D${d.district}`,
    "ELA Gain": d.elaChange,
    "Math Gain": d.mathChange,
    avgChange: d.avgChange,
  }));

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="chart-title-district-recovery">
          <Award className="w-5 h-5 text-amber-600" />
          Top 10 Districts by Recovery (2022 → 2025)
        </CardTitle>
        <CardDescription>
          Districts with the largest combined ELA and Math gains since COVID's lowest point.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="district" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(v) => `+${v}%`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`+${value}%`, '']}
              />
              <Legend />
              <Bar dataKey="ELA Gain" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Math Gain" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopImprovedSchoolsTable() {
  const { data, isLoading } = useCovidRecoveryData();

  const getBoroughName = (code: string) => {
    const map: Record<string, string> = {
      'M': 'Manhattan',
      'X': 'Bronx',
      'K': 'Brooklyn',
      'Q': 'Queens',
      'R': 'Staten Island',
    };
    return map[code] || code;
  };

  if (isLoading || !data) {
    return (
      <Card className="my-8">
        <CardHeader>
          <CardTitle className="text-lg">Loading...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="chart-title-top-schools">
          <School className="w-5 h-5 text-emerald-600" />
          Top 10 Most Improved Schools (2022 → 2025)
        </CardTitle>
        <CardDescription>
          Schools with the largest combined ELA and Math proficiency gains.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-top-improved">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">School</th>
                <th className="text-center py-2 px-2 font-medium">Borough</th>
                <th className="text-center py-2 px-2 font-medium">ELA Change</th>
                <th className="text-center py-2 px-2 font-medium">Math Change</th>
                <th className="text-center py-2 px-2 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.topImprovedSchools.map((school, i) => (
                <tr key={school.dbn} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2">
                    <a 
                      href={`/school/${school.dbn.toLowerCase()}`}
                      className="text-primary hover:underline"
                    >
                      {school.name}
                    </a>
                  </td>
                  <td className="text-center py-2 px-2 text-muted-foreground">
                    {getBoroughName(school.borough)}
                  </td>
                  <td className="text-center py-2 px-2 text-emerald-600 font-medium">
                    +{school.elaChange}%
                  </td>
                  <td className="text-center py-2 px-2 text-emerald-600 font-medium">
                    +{school.mathChange}%
                  </td>
                  <td className="text-center py-2 px-2 font-bold text-primary">
                    +{school.totalChange}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ==========================================
// ADMISSIONS & DEMAND CHARTS
// ==========================================

const admissionsDemandByGrade = [
  { grade: "3-K", avgAppsPerSeat: 1.8, avgOfferRate: 56, totalApplicants: 45000, totalSeats: 25000, competitiveness: "Moderate" },
  { grade: "Pre-K", avgAppsPerSeat: 2.4, avgOfferRate: 42, totalApplicants: 68000, totalSeats: 28000, competitiveness: "Competitive" },
  { grade: "Kindergarten", avgAppsPerSeat: 3.1, avgOfferRate: 32, totalApplicants: 72000, totalSeats: 23000, competitiveness: "Very Competitive" },
];

const competitivenessDistribution = [
  { name: "Very Competitive (3+ apps/seat)", value: 312, color: "#ef4444" },
  { name: "Competitive (2-3 apps/seat)", value: 428, color: "#f97316" },
  { name: "Moderate (1.2-2 apps/seat)", value: 387, color: "#eab308" },
  { name: "Accessible (<1.2 apps/seat)", value: 406, color: "#10b981" },
];

const boroughDemandData = [
  { borough: "Manhattan", kindergarten: 3.8, preK: 2.9, threeK: 2.2 },
  { borough: "Brooklyn", kindergarten: 3.2, preK: 2.5, threeK: 1.9 },
  { borough: "Queens", kindergarten: 2.8, preK: 2.1, threeK: 1.6 },
  { borough: "Bronx", kindergarten: 2.4, preK: 1.8, threeK: 1.4 },
  { borough: "Staten Island", kindergarten: 2.1, preK: 1.5, threeK: 1.2 },
];

const yearOverYearTrend = [
  { year: "2020-21", kindergarten: 2.1, preK: 1.8, threeK: 1.2 },
  { year: "2021-22", kindergarten: 2.4, preK: 2.0, threeK: 1.4 },
  { year: "2022-23", kindergarten: 2.7, preK: 2.2, threeK: 1.6 },
  { year: "2023-24", kindergarten: 3.0, preK: 2.4, threeK: 1.8 },
  { year: "2024-25", kindergarten: 3.1, preK: 2.4, threeK: 1.8 },
];

const topCompetitiveSchools = [
  { name: "P.S. 6 Lillie D. Blake", borough: "Manhattan", grade: "K", appsPerSeat: 8.2, offerRate: "12%" },
  { name: "P.S. 234 Independence School", borough: "Manhattan", grade: "K", appsPerSeat: 7.5, offerRate: "13%" },
  { name: "P.S. 321 William Penn", borough: "Brooklyn", grade: "K", appsPerSeat: 7.1, offerRate: "14%" },
  { name: "P.S. 87 William Sherman", borough: "Manhattan", grade: "K", appsPerSeat: 6.8, offerRate: "15%" },
  { name: "P.S. 41 Greenwich Village", borough: "Manhattan", grade: "Pre-K", appsPerSeat: 6.4, offerRate: "16%" },
  { name: "P.S. 234 Independence School", borough: "Manhattan", grade: "Pre-K", appsPerSeat: 6.1, offerRate: "16%" },
  { name: "P.S. 3 John Melser", borough: "Manhattan", grade: "K", appsPerSeat: 5.9, offerRate: "17%" },
  { name: "Brooklyn New School (P.S. 146)", borough: "Brooklyn", grade: "K", appsPerSeat: 5.7, offerRate: "18%" },
];

export function AdmissionsStatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-8" data-testid="admissions-stats-cards">
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">185K+</div>
            <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">Total Applications</div>
            <div className="text-xs text-muted-foreground mt-2">Across K, Pre-K, and 3-K</div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">76K</div>
            <div className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">Seats Available</div>
            <div className="text-xs text-muted-foreground mt-2">Citywide capacity</div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-amber-600 dark:text-amber-400">2.4:1</div>
            <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">Avg Apps Per Seat</div>
            <div className="text-xs text-muted-foreground mt-2">City average demand ratio</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function DemandByGradeChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-demand-grade">
          Average Applications Per Seat by Grade Level
        </CardTitle>
        <CardDescription>
          Kindergarten programs are the most competitive, with 3.1 applications per available seat
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={admissionsDemandByGrade}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="grade" 
                tick={{ fontSize: 14 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 4]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Apps per Seat', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} apps/seat`, 'Demand Ratio']}
              />
              <ReferenceLine y={1} stroke="#10b981" strokeDasharray="3 3" label={{ value: "1:1 (All get offers)", position: "right", fill: "#10b981", fontSize: 10 }} />
              <Bar dataKey="avgAppsPerSeat" name="Apps per Seat" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function CompetitivenessDistributionChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-competitiveness">
          NYC Schools by Competitiveness Level
        </CardTitle>
        <CardDescription>
          Distribution of ~1,500 programs across four competitiveness tiers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={competitivenessDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {competitivenessDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} programs`, '']}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function BoroughDemandChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-borough-demand">
          Admissions Demand by Borough
        </CardTitle>
        <CardDescription>
          Manhattan leads in competition across all grade levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={boroughDemandData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="borough" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 5]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Apps per Seat', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} apps/seat`, '']}
              />
              <Legend />
              <Bar dataKey="kindergarten" name="Kindergarten" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="preK" name="Pre-K" fill="#f97316" radius={[4, 4, 0, 0]} />
              <Bar dataKey="threeK" name="3-K" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function DemandTrendChart() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="chart-title-demand-trend">
          <TrendingUp className="w-5 h-5 text-primary" />
          Admissions Demand Trend (2020-2025)
        </CardTitle>
        <CardDescription>
          Competition has increased steadily since pandemic recovery
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={yearOverYearTrend}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                domain={[0, 4]} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{ value: 'Apps per Seat', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                formatter={(value: number) => [`${value} apps/seat`, '']}
              />
              <Legend />
              <Line type="monotone" dataKey="kindergarten" name="Kindergarten" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="preK" name="Pre-K" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="threeK" name="3-K" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function TopCompetitiveSchoolsTable() {
  return (
    <Card className="my-8">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="chart-title-top-competitive">
          <Award className="w-5 h-5 text-amber-600" />
          Most Competitive NYC Schools (2024-25)
        </CardTitle>
        <CardDescription>
          Schools with the highest application-to-seat ratios
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-top-competitive">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">School</th>
                <th className="text-center py-2 px-2 font-medium">Borough</th>
                <th className="text-center py-2 px-2 font-medium">Grade</th>
                <th className="text-center py-2 px-2 font-medium">Apps/Seat</th>
                <th className="text-center py-2 px-2 font-medium">Offer Rate</th>
              </tr>
            </thead>
            <tbody>
              {topCompetitiveSchools.map((school, i) => (
                <tr key={`${school.name}-${school.grade}-${i}`} className="border-b hover:bg-muted/50">
                  <td className="py-2 px-2 font-medium">{school.name}</td>
                  <td className="text-center py-2 px-2 text-muted-foreground">{school.borough}</td>
                  <td className="text-center py-2 px-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      school.grade === 'K' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      school.grade === 'Pre-K' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300' :
                      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                    }`}>
                      {school.grade}
                    </span>
                  </td>
                  <td className="text-center py-2 px-2 font-bold text-red-600 dark:text-red-400">{school.appsPerSeat}:1</td>
                  <td className="text-center py-2 px-2 text-muted-foreground">{school.offerRate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          Data based on NYC DOE Local Law 72 admissions reports
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// "Diamonds in the Rough" blog post — top-rated NYC schools in high-crime areas
// Data sourced live from /api/safe-and-strong (joins schools × NYPD safety index)
// ============================================================================

interface SafeAndStrongRow {
  dbn: string;
  name: string;
  slug: string;
  borough: string;
  district: number;
  gradeBand: string | null;
  enrollment: number;
  overallScore: number;
  safetyIndex: number;
  combinedScore: number;
}

const BORO_NAMES: Record<string, string> = {
  M: "Manhattan",
  X: "Bronx",
  K: "Brooklyn",
  Q: "Queens",
  R: "Staten Island",
};

const BORO_COLORS: Record<string, string> = {
  Manhattan: "#3b82f6",
  Bronx: "#ef4444",
  Brooklyn: "#10b981",
  Queens: "#f59e0b",
  "Staten Island": "#8b5cf6",
};

function useSafeAndStrong() {
  return useQuery<SafeAndStrongRow[]>({
    queryKey: ["/api/safe-and-strong"],
    staleTime: 1000 * 60 * 60,
  });
}

export function DiamondsKeyStatsCards() {
  const { data, isLoading } = useSafeAndStrong();

  if (isLoading || !data) {
    return (
      <div className="not-prose grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse"><CardContent className="pt-6 h-24" /></Card>
        ))}
      </div>
    );
  }

  const total = data.length;
  const diamonds = data.filter((d) => d.overallScore >= 95 && d.safetyIndex <= 30).length;
  const looseTier = data.filter((d) => d.overallScore >= 80 && d.safetyIndex <= 40).length;

  // Pearson correlation between safety and overall
  const n = data.length;
  const meanX = data.reduce((a, d) => a + d.safetyIndex, 0) / n;
  const meanY = data.reduce((a, d) => a + d.overallScore, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (const d of data) {
    const xd = d.safetyIndex - meanX;
    const yd = d.overallScore - meanY;
    num += xd * yd; dx2 += xd * xd; dy2 += yd * yd;
  }
  const r = dx2 && dy2 ? num / Math.sqrt(dx2 * dy2) : 0;

  const stats = [
    { label: "NYC Public Schools Analyzed", value: total.toLocaleString(), color: "text-foreground" },
    { label: "Top-Rated in High-Crime Areas", value: looseTier.toLocaleString(), sub: "Rating ≥ 80, Safety ≤ 40", color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Elite Diamonds", value: diamonds.toLocaleString(), sub: "Rating ≥ 95, Safety ≤ 30", color: "text-blue-600 dark:text-blue-400" },
    { label: "Crime ↔ Quality Correlation", value: `r = ${r.toFixed(2)}`, sub: "Essentially zero", color: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="not-prose grid grid-cols-2 md:grid-cols-4 gap-4 my-8" data-testid="stats-diamonds-key">
      {stats.map((s) => (
        <Card key={s.label}>
          <CardContent className="pt-6">
            <div className={`text-2xl font-bold ${s.color}`} data-testid={`stat-value-${s.label.toLowerCase().replace(/\s+/g, "-")}`}>{s.value}</div>
            <div className="text-xs font-medium text-foreground mt-1">{s.label}</div>
            {s.sub && <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DiamondsScatterChart() {
  const { data, isLoading } = useSafeAndStrong();

  if (isLoading || !data) {
    return <Card className="my-6"><CardContent className="pt-6 h-80 animate-pulse" /></Card>;
  }

  // Down-sample to keep the chart light, then add highlight series
  const stride = Math.max(1, Math.ceil(data.length / 220));
  const sample = data
    .filter((_, i) => i % stride === 0)
    .map((d) => ({
      x: d.safetyIndex,
      y: d.overallScore,
      name: d.name,
      borough: BORO_NAMES[d.borough] || "Other",
    }));

  const diamonds = data
    .filter((d) => d.overallScore >= 95 && d.safetyIndex <= 30)
    .map((d) => ({
      x: d.safetyIndex,
      y: d.overallScore,
      name: d.name,
      borough: BORO_NAMES[d.borough] || "Other",
    }));

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-diamonds-scatter">
          Neighborhood Safety vs. School Quality (1,500 NYC Public Schools)
        </CardTitle>
        <CardDescription>
          Each dot is one school. Highlighted dots are the elite "diamonds" — rating 95+ and bottom-third safety.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 16, right: 24, bottom: 48, left: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Neighborhood Safety Index"
              domain={[0, 100]}
              label={{ value: "Neighborhood Safety Index (0 = high crime, 100 = safest)", position: "insideBottom", offset: -8, style: { fontSize: 12 } }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Overall School Rating"
              domain={[0, 100]}
              label={{ value: "Overall School Rating", angle: -90, position: "insideLeft", style: { fontSize: 12 } }}
            />
            <ReferenceLine x={30} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Safety 30", position: "top", style: { fontSize: 10, fill: "#ef4444" } }} />
            <ReferenceLine y={95} stroke="#10b981" strokeDasharray="4 4" label={{ value: "Rating 95", position: "right", style: { fontSize: 10, fill: "#10b981" } }} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-background border rounded-md p-2 text-xs shadow-md">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-muted-foreground">{p.borough}</div>
                    <div>Safety: <strong>{p.x}</strong> · Rating: <strong>{p.y}</strong></div>
                  </div>
                );
              }}
            />
            <Scatter name="All NYC schools" data={sample} fill="#94a3b8" fillOpacity={0.55} />
            <Scatter name="Elite diamonds (Rating ≥95, Safety ≤30)" data={diamonds} fill="#3b82f6" fillOpacity={0.95} />
            <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DiamondsBoroughChart() {
  const { data, isLoading } = useSafeAndStrong();

  if (isLoading || !data) {
    return <Card className="my-6"><CardContent className="pt-6 h-72 animate-pulse" /></Card>;
  }

  const tier = data.filter((d) => d.overallScore >= 80 && d.safetyIndex <= 40);
  const counts = new Map<string, number>();
  for (const d of tier) {
    const b = BORO_NAMES[d.borough] || "Other";
    counts.set(b, (counts.get(b) || 0) + 1);
  }
  const chartData = Array.from(counts.entries())
    .map(([borough, count]) => ({ borough, count, fill: BORO_COLORS[borough] || "#64748b" }))
    .sort((a, b) => b.count - a.count);

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-lg" data-testid="chart-title-diamonds-borough">
          Where Are the Diamonds? Borough Breakdown
        </CardTitle>
        <CardDescription>
          Count of NYC public schools rated 80+ that sit in the bottom 40 for neighborhood safety.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="borough" />
            <YAxis label={{ value: "# of schools", angle: -90, position: "insideLeft", style: { fontSize: 12 } }} />
            <Tooltip />
            <Bar dataKey="count" name="Top-rated schools in low-safety areas">
              {chartData.map((entry) => (
                <Cell key={entry.borough} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TopDiamondsTable() {
  const { data, isLoading } = useSafeAndStrong();

  if (isLoading || !data) {
    return <Card className="my-6"><CardContent className="pt-6 h-96 animate-pulse" /></Card>;
  }

  const top = data
    .filter((d) => d.overallScore >= 95 && d.safetyIndex <= 30)
    .sort((a, b) => (b.overallScore - a.overallScore) || (a.safetyIndex - b.safetyIndex))
    .slice(0, 15);

  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2" data-testid="chart-title-top-diamonds">
          <Award className="w-5 h-5 text-blue-600" />
          15 Top-Rated NYC Public Schools in High-Crime Neighborhoods
        </CardTitle>
        <CardDescription>
          Ranked by Overall Rating, then by lowest Safety Index. Click any school for full data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" data-testid="table-top-diamonds">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium">#</th>
                <th className="text-left py-2 px-2 font-medium">School</th>
                <th className="text-center py-2 px-2 font-medium">Borough</th>
                <th className="text-center py-2 px-2 font-medium">Grades</th>
                <th className="text-center py-2 px-2 font-medium">Rating</th>
                <th className="text-center py-2 px-2 font-medium">Safety</th>
              </tr>
            </thead>
            <tbody>
              {top.map((s, i) => (
                <tr key={s.dbn} className="border-b hover-elevate">
                  <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-2 px-2 font-medium">
                    <a href={`/school/${s.slug}`} className="text-primary hover:underline" data-testid={`link-school-${s.dbn}`}>
                      {s.name}
                    </a>
                    <div className="text-xs text-muted-foreground">DBN {s.dbn} · D{s.district}</div>
                  </td>
                  <td className="text-center py-2 px-2 text-muted-foreground">{BORO_NAMES[s.borough] || s.borough}</td>
                  <td className="text-center py-2 px-2 text-muted-foreground">{s.gradeBand || "—"}</td>
                  <td className="text-center py-2 px-2 font-bold text-emerald-600 dark:text-emerald-400">{s.overallScore}</td>
                  <td className="text-center py-2 px-2 font-bold text-red-600 dark:text-red-400">{s.safetyIndex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground mt-4">
          Safety Index is a 0–100 citywide percentile from the trailing 12 months of severity-weighted NYPD complaint data within 0.5 miles of each school. Data updates monthly.
        </p>
      </CardContent>
    </Card>
  );
}
