import { createRoot } from 'react-dom/client';
import { useToolOutput, useTheme } from './hooks/useOpenAiGlobal';
import { SchoolCarousel } from './components/SchoolCarousel';
import { SchoolCard } from './components/SchoolCard';
import { CompareGrid } from './components/CompareGrid';
import { SchoolMap } from './components/SchoolMap';
import { FavoritesList } from './components/FavoritesList';
import './styles.css';

function App() {
  const toolOutput = useToolOutput();
  const theme = useTheme();
  
  if (!toolOutput) {
    return (
      <div className="widget-container">
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <p className="text-secondary">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  const data = typeof toolOutput === 'string' ? JSON.parse(toolOutput) : toolOutput;
  
  if (data.schools && Array.isArray(data.schools)) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <SchoolCarousel 
          schools={data.schools} 
          title={`Found ${data.total_found || data.schools.length} schools`}
        />
      </div>
    );
  }
  
  if (data.top_schools && Array.isArray(data.top_schools)) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <SchoolCarousel 
          schools={data.top_schools} 
          title={`Top ${data.top_schools.length} Schools`}
        />
      </div>
    );
  }
  
  if (data.comparison && Array.isArray(data.comparison)) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <CompareGrid schools={data.comparison} />
      </div>
    );
  }
  
  if (data.favorites && Array.isArray(data.favorites)) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <FavoritesList 
          favorites={data.favorites} 
          totalFavorites={data.total_favorites || data.favorites.length}
        />
      </div>
    );
  }
  
  if (data.dbn && data.name && data.overall_score !== undefined) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <SchoolCard school={data} />
      </div>
    );
  }
  
  const allSchools = [
    ...(data.schools || []),
    ...(data.top_schools || []),
    ...(data.comparison || []),
    ...(data.favorites || [])
  ].filter(s => s.latitude && s.longitude);
  
  if (allSchools.length > 0) {
    return (
      <div className={theme === 'dark' ? 'dark' : ''}>
        <SchoolMap schools={allSchools} />
      </div>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="widget-container">
        <div className="card">
          <div className="card-body">
            <pre className="text-sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
