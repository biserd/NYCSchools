interface CompareSchool {
  dbn: string;
  name: string;
  district: number;
  borough: string;
  grade_band: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  overall_score: number;
  academics_score?: number;
  climate_score?: number;
  progress_score?: number;
  ela_proficiency?: number;
  math_proficiency?: number;
  enrollment?: number;
  student_teacher_ratio?: number;
  has_gifted_talented?: boolean;
  has_dual_language?: boolean;
  has_3k?: boolean;
  has_prek?: boolean;
  error?: string;
}

interface CompareGridProps {
  schools: CompareSchool[];
  onViewDetails?: (dbn: string) => void;
}

function getScoreClass(score: number | undefined): string {
  if (!score) return 'score-average';
  if (score >= 80) return 'score-excellent';
  if (score >= 60) return 'score-good';
  if (score >= 40) return 'score-average';
  return 'score-low';
}

function getBoroughClass(borough: string): string {
  const b = borough.toLowerCase().replace(' ', '-');
  if (b === 'manhattan') return 'borough-manhattan';
  if (b === 'brooklyn') return 'borough-brooklyn';
  if (b === 'queens') return 'borough-queens';
  if (b === 'bronx') return 'borough-bronx';
  return 'borough-staten-island';
}

function MetricComparison({ 
  label, 
  values,
  highlight = 'high'
}: { 
  label: string; 
  values: (number | undefined | null)[];
  highlight?: 'high' | 'low';
}) {
  const validValues = values.filter((v): v is number => v !== undefined && v !== null);
  const bestValue = highlight === 'high' 
    ? Math.max(...validValues) 
    : Math.min(...validValues);
  
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <div className="flex gap-md">
        {values.map((value, i) => (
          <div 
            key={i} 
            className="metric-value" 
            style={{ 
              minWidth: '40px', 
              textAlign: 'center',
              color: value === bestValue && validValues.length > 1 ? 'var(--color-accent)' : undefined,
              fontWeight: value === bestValue && validValues.length > 1 ? '700' : undefined
            }}
          >
            {value ?? '—'}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CompareGrid({ schools, onViewDetails }: CompareGridProps) {
  const validSchools = schools.filter(s => !s.error);
  const gridClass = validSchools.length <= 2 ? 'compare-grid-2' : 
                    validSchools.length === 3 ? 'compare-grid-3' : 'compare-grid-4';

  const handleViewDetails = (dbn: string) => {
    if (onViewDetails) {
      onViewDetails(dbn);
    } else if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt: `Tell me more about school ${dbn}` });
    }
  };

  return (
    <div className="widget-container">
      <h3 className="font-semibold" style={{ marginBottom: 'var(--spacing-md)' }}>
        School Comparison
      </h3>
      
      <div className={`compare-grid ${gridClass}`} style={{ marginBottom: 'var(--spacing-md)' }}>
        {validSchools.map((school) => (
          <div key={school.dbn} className="card">
            <div className="card-header" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <span className={`borough-badge ${getBoroughClass(school.borough)}`} style={{ marginBottom: 'var(--spacing-xs)', display: 'inline-block' }}>
                {school.borough}
              </span>
              <h4 className="font-medium text-sm truncate">{school.name}</h4>
              <div className="text-xs text-tertiary">{school.grade_band}</div>
            </div>
            
            <div className="card-body" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-sm)' }}>
                <span className={`score-badge ${getScoreClass(school.overall_score)}`}>
                  {school.overall_score}
                </span>
                <span className="text-xs text-secondary">Overall</span>
              </div>
              
              <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                {school.has_gifted_talented && <span className="tag tag-accent text-xs">G&T</span>}
                {school.has_dual_language && <span className="tag text-xs">Dual Lang</span>}
              </div>
            </div>
            
            <div className="card-footer" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <button 
                className="btn btn-secondary text-xs" 
                style={{ flex: 1, padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                onClick={() => handleViewDetails(school.dbn)}
              >
                Details
              </button>
            </div>
          </div>
        ))}
      </div>
      
      <div className="card">
        <div className="card-body">
          <div className="text-sm font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>
            Score Comparison
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--spacing-xs)' }}>
            <div className="flex gap-md">
              {validSchools.map((s, i) => (
                <div key={i} className="text-xs text-tertiary" style={{ minWidth: '40px', textAlign: 'center' }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
          
          <MetricComparison 
            label="Overall" 
            values={validSchools.map(s => s.overall_score)} 
          />
          <MetricComparison 
            label="Academics" 
            values={validSchools.map(s => s.academics_score)} 
          />
          <MetricComparison 
            label="Climate" 
            values={validSchools.map(s => s.climate_score)} 
          />
          <MetricComparison 
            label="Progress" 
            values={validSchools.map(s => s.progress_score)} 
          />
          <MetricComparison 
            label="ELA %" 
            values={validSchools.map(s => s.ela_proficiency)} 
          />
          <MetricComparison 
            label="Math %" 
            values={validSchools.map(s => s.math_proficiency)} 
          />
          <MetricComparison 
            label="Enrollment" 
            values={validSchools.map(s => s.enrollment)} 
            highlight="low"
          />
          <MetricComparison 
            label="Student:Teacher" 
            values={validSchools.map(s => s.student_teacher_ratio)} 
            highlight="low"
          />
        </div>
      </div>
    </div>
  );
}
