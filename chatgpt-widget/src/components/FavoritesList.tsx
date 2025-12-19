interface FavoriteSchool {
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
  has_gifted_talented?: boolean;
  has_dual_language?: boolean;
  favorited_at?: string;
}

interface FavoritesListProps {
  favorites: FavoriteSchool[];
  totalFavorites: number;
  onViewDetails?: (dbn: string) => void;
  onCompare?: () => void;
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

export function FavoritesList({ favorites, totalFavorites, onViewDetails, onCompare }: FavoritesListProps) {
  const handleViewDetails = (dbn: string) => {
    if (onViewDetails) {
      onViewDetails(dbn);
    } else if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt: `Tell me more about school ${dbn}` });
    }
  };

  const handleCompare = () => {
    if (onCompare) {
      onCompare();
    } else if (window.openai?.sendFollowUpMessage) {
      const dbns = favorites.slice(0, 4).map(f => f.dbn).join(', ');
      window.openai.sendFollowUpMessage({ 
        prompt: `Compare these schools: ${dbns}` 
      });
    }
  };

  if (favorites.length === 0) {
    return (
      <div className="widget-container">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <div style={{ fontSize: '32px', marginBottom: 'var(--spacing-sm)' }}>💙</div>
            <h4 className="font-medium" style={{ marginBottom: 'var(--spacing-xs)' }}>No Favorites Yet</h4>
            <p className="text-sm text-secondary">
              Start exploring schools and save your favorites to see them here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget-container">
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-md)' }}>
        <div>
          <h3 className="font-semibold">Your Favorites</h3>
          <p className="text-sm text-secondary">{totalFavorites} saved schools</p>
        </div>
        {favorites.length >= 2 && (
          <button className="btn btn-primary text-sm" onClick={handleCompare}>
            Compare All
          </button>
        )}
      </div>
      
      <div className="flex flex-col gap-sm">
        {favorites.map((school) => (
          <div key={school.dbn} className="card">
            <div className="card-body" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <div className="flex items-center justify-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-sm" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <span className={`borough-badge ${getBoroughClass(school.borough)}`}>
                      {school.borough}
                    </span>
                    <span className="text-xs text-tertiary">{school.grade_band}</span>
                  </div>
                  
                  <h4 className="font-medium truncate" style={{ marginBottom: 'var(--spacing-xs)' }}>
                    {school.name}
                  </h4>
                  
                  <div className="flex items-center gap-sm">
                    <span className={`score-badge ${getScoreClass(school.overall_score)}`}>
                      {school.overall_score}
                    </span>
                    
                    <div className="flex gap-xs">
                      {school.has_gifted_talented && <span className="tag tag-accent text-xs">G&T</span>}
                      {school.has_dual_language && <span className="tag text-xs">Dual Lang</span>}
                    </div>
                  </div>
                </div>
                
                <button 
                  className="btn btn-secondary text-sm"
                  onClick={() => handleViewDetails(school.dbn)}
                >
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
