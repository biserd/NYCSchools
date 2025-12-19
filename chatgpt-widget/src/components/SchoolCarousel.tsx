interface School {
  dbn: string;
  name: string;
  district: number;
  borough: string;
  grade_band: string;
  overall_score: number;
  academics_score?: number;
  climate_score?: number;
  progress_score?: number;
  ela_proficiency?: number;
  math_proficiency?: number;
  has_gifted_talented?: boolean;
  has_dual_language?: boolean;
  has_3k?: boolean;
  has_prek?: boolean;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface SchoolCarouselProps {
  schools: School[];
  title?: string;
  onViewDetails?: (dbn: string) => void;
  onViewMap?: () => void;
}

function getScoreClass(score: number): string {
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

export function SchoolCarousel({ schools, title, onViewDetails, onViewMap }: SchoolCarouselProps) {
  const handleViewDetails = (dbn: string) => {
    if (onViewDetails) {
      onViewDetails(dbn);
    } else if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt: `Tell me more about school ${dbn}` });
    }
  };

  const handleViewMap = () => {
    if (onViewMap) {
      onViewMap();
    } else if (window.openai?.requestDisplayMode) {
      window.openai.requestDisplayMode({ mode: 'fullscreen' });
    }
  };

  return (
    <div className="widget-container">
      {title && (
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
          <h3 className="font-semibold">{title}</h3>
          {schools.some(s => s.latitude && s.longitude) && (
            <button className="btn btn-secondary text-sm" onClick={handleViewMap}>
              View Map
            </button>
          )}
        </div>
      )}
      
      <div className="carousel-container">
        {schools.map((school) => (
          <div key={school.dbn} className="carousel-item">
            <div className="school-image" />
            
            <div className="card-body">
              <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-xs)' }}>
                <span className={`borough-badge ${getBoroughClass(school.borough)}`}>
                  {school.borough}
                </span>
                <span className="text-xs text-tertiary">{school.grade_band}</span>
              </div>
              
              <h4 className="font-medium truncate" style={{ marginBottom: 'var(--spacing-xs)' }}>
                {school.name}
              </h4>
              
              <div className="text-xs text-secondary" style={{ marginBottom: 'var(--spacing-sm)' }}>
                District {school.district} • {school.dbn}
              </div>
              
              <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-sm)' }}>
                <span className={`score-badge ${getScoreClass(school.overall_score)}`}>
                  {school.overall_score}
                </span>
                <span className="text-sm text-secondary">Overall Score</span>
              </div>
              
              <div className="flex gap-xs" style={{ flexWrap: 'wrap' }}>
                {school.has_gifted_talented && <span className="tag tag-accent">G&T</span>}
                {school.has_dual_language && <span className="tag">Dual Lang</span>}
                {school.has_prek && <span className="tag">Pre-K</span>}
                {school.has_3k && <span className="tag">3-K</span>}
              </div>
            </div>
            
            <div className="card-footer">
              <button 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                onClick={() => handleViewDetails(school.dbn)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {schools.length > 3 && (
        <div className="text-xs text-tertiary" style={{ marginTop: 'var(--spacing-sm)', textAlign: 'center' }}>
          Scroll to see more schools →
        </div>
      )}
    </div>
  );
}
