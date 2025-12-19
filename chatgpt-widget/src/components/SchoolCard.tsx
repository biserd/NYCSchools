interface SchoolDetails {
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
  principal?: string;
  phone?: string;
  website?: string;
  survey_data?: {
    safety_respect_score?: number;
    communication_score?: number;
    engagement_score?: number;
  };
  avg_rating?: number;
  review_count?: number;
}

interface SchoolCardProps {
  school: SchoolDetails;
  onViewWebsite?: () => void;
  onCompare?: () => void;
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

function ScoreBar({ label, score }: { label: string; score?: number }) {
  if (score === undefined || score === null) return null;
  
  return (
    <div className="metric-row">
      <span className="metric-label">{label}</span>
      <div className="flex items-center gap-sm">
        <div style={{ 
          width: '60px', 
          height: '6px', 
          background: 'var(--color-bg-tertiary)', 
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{ 
            width: `${score}%`, 
            height: '100%',
            background: score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : score >= 40 ? '#f97316' : '#ef4444',
            borderRadius: '3px'
          }} />
        </div>
        <span className="metric-value">{score}</span>
      </div>
    </div>
  );
}

export function SchoolCard({ school, onViewWebsite, onCompare }: SchoolCardProps) {
  const handleViewWebsite = () => {
    if (school.website && window.openai?.openExternal) {
      window.openai.openExternal({ href: school.website });
    } else if (onViewWebsite) {
      onViewWebsite();
    }
  };

  const handleCompare = () => {
    if (onCompare) {
      onCompare();
    } else if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ 
        prompt: `Compare ${school.name} with other top schools in the area` 
      });
    }
  };

  return (
    <div className="widget-container">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-xs)' }}>
            <span className={`borough-badge ${getBoroughClass(school.borough)}`}>
              {school.borough}
            </span>
            <span className="text-xs text-tertiary">{school.grade_band}</span>
            <span className="text-xs text-tertiary">District {school.district}</span>
          </div>
          
          <h3 className="font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
            {school.name}
          </h3>
          
          <div className="text-sm text-secondary" style={{ marginTop: 'var(--spacing-xs)' }}>
            {school.address || school.dbn}
          </div>
          
          <div className="flex items-center gap-md" style={{ marginTop: 'var(--spacing-md)' }}>
            <div className="flex items-center gap-sm">
              <span className={`score-badge ${getScoreClass(school.overall_score)}`} style={{ fontSize: 'var(--font-size-lg)', minWidth: '44px', height: '32px' }}>
                {school.overall_score}
              </span>
              <span className="text-sm font-medium">Overall Score</span>
            </div>
            
            {school.avg_rating && (
              <div className="flex items-center gap-xs text-sm text-secondary">
                <span>★</span>
                <span>{school.avg_rating.toFixed(1)}</span>
                {school.review_count && <span>({school.review_count} reviews)</span>}
              </div>
            )}
          </div>
        </div>
        
        <div className="card-body">
          <div style={{ marginBottom: 'var(--spacing-md)' }}>
            <div className="text-sm font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>Scores</div>
            <ScoreBar label="Academics" score={school.academics_score} />
            <ScoreBar label="Climate" score={school.climate_score} />
            <ScoreBar label="Progress" score={school.progress_score} />
          </div>
          
          {(school.ela_proficiency || school.math_proficiency) && (
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <div className="text-sm font-medium" style={{ marginBottom: 'var(--spacing-sm)' }}>Test Proficiency</div>
              <ScoreBar label="ELA" score={school.ela_proficiency} />
              <ScoreBar label="Math" score={school.math_proficiency} />
            </div>
          )}
          
          <div className="flex gap-sm" style={{ flexWrap: 'wrap', marginBottom: 'var(--spacing-md)' }}>
            {school.enrollment && (
              <div className="tag">
                {school.enrollment.toLocaleString()} students
              </div>
            )}
            {school.student_teacher_ratio && (
              <div className="tag">
                {school.student_teacher_ratio}:1 ratio
              </div>
            )}
            {school.has_gifted_talented && <span className="tag tag-accent">G&T</span>}
            {school.has_dual_language && <span className="tag">Dual Language</span>}
            {school.has_prek && <span className="tag">Pre-K</span>}
            {school.has_3k && <span className="tag">3-K</span>}
          </div>
        </div>
        
        <div className="card-footer">
          {school.website && (
            <button className="btn btn-primary" onClick={handleViewWebsite}>
              Visit Website
            </button>
          )}
          <button className="btn btn-secondary" onClick={handleCompare}>
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
