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
