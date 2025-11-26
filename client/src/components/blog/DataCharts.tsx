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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
