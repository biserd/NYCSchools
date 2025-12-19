import { useEffect, useRef } from 'react';
import { useDisplayMode } from '../hooks/useOpenAiGlobal';

interface MapSchool {
  dbn: string;
  name: string;
  borough: string;
  overall_score: number;
  latitude?: number;
  longitude?: number;
  grade_band?: string;
}

interface SchoolMapProps {
  schools: MapSchool[];
  center?: { lat: number; lng: number };
  zoom?: number;
  onSelectSchool?: (dbn: string) => void;
}

function getMarkerColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

export function SchoolMap({ schools, center, zoom = 12, onSelectSchool }: SchoolMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const displayMode = useDisplayMode();
  
  const validSchools = schools.filter(s => s.latitude && s.longitude);
  
  const mapCenter = center || (validSchools.length > 0 ? {
    lat: validSchools.reduce((sum, s) => sum + (s.latitude || 0), 0) / validSchools.length,
    lng: validSchools.reduce((sum, s) => sum + (s.longitude || 0), 0) / validSchools.length
  } : { lat: 40.7128, lng: -74.006 });

  const handleSchoolClick = (dbn: string) => {
    if (onSelectSchool) {
      onSelectSchool(dbn);
    } else if (window.openai?.sendFollowUpMessage) {
      window.openai.sendFollowUpMessage({ prompt: `Tell me about school ${dbn}` });
    }
  };

  const handleExpandMap = () => {
    if (window.openai?.requestDisplayMode) {
      window.openai.requestDisplayMode({ mode: 'fullscreen' });
    }
  };

  useEffect(() => {
    if (!mapRef.current || validSchools.length === 0) return;
    
    const container = mapRef.current;
    container.innerHTML = `
      <div style="
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 50%, #7dd3fc 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      ">
        <div style="
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          opacity: 0.1;
          background-image: url('data:image/svg+xml,<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 100 100\"><circle cx=\"50\" cy=\"50\" r=\"2\" fill=\"%23000\"/></svg>');
          background-size: 20px 20px;
        "></div>
        
        <div style="
          position: relative;
          z-index: 1;
          text-align: center;
          padding: var(--spacing-xl);
        ">
          <div style="font-size: 48px; margin-bottom: var(--spacing-md);">🗺️</div>
          <div style="font-size: var(--font-size-lg); font-weight: 600; color: #0369a1; margin-bottom: var(--spacing-sm);">
            ${validSchools.length} Schools on Map
          </div>
          <div style="font-size: var(--font-size-sm); color: #0c4a6e;">
            Center: ${mapCenter.lat.toFixed(4)}, ${mapCenter.lng.toFixed(4)}
          </div>
        </div>
        
        <div style="
          position: absolute;
          bottom: var(--spacing-md);
          left: var(--spacing-md);
          right: var(--spacing-md);
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
          justify-content: center;
        ">
          ${validSchools.slice(0, 6).map(s => `
            <div 
              onclick="window.handleSchoolClick && window.handleSchoolClick('${s.dbn}')"
              style="
                background: white;
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--radius-sm);
                font-size: var(--font-size-xs);
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
              "
            >
              <span style="
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${getMarkerColor(s.overall_score)};
              "></span>
              <span style="max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${s.name.length > 20 ? s.name.slice(0, 20) + '...' : s.name}
              </span>
            </div>
          `).join('')}
          ${validSchools.length > 6 ? `
            <div style="
              background: white;
              padding: var(--spacing-xs) var(--spacing-sm);
              border-radius: var(--radius-sm);
              font-size: var(--font-size-xs);
              box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            ">
              +${validSchools.length - 6} more
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    (window as any).handleSchoolClick = handleSchoolClick;
    
    return () => {
      delete (window as any).handleSchoolClick;
    };
  }, [validSchools, mapCenter]);

  const isFullscreen = displayMode === 'fullscreen';
  const containerHeight = isFullscreen ? '100vh' : '300px';

  return (
    <div className="widget-container">
      {!isFullscreen && (
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--spacing-sm)' }}>
          <h3 className="font-semibold">School Locations</h3>
          <button className="btn btn-secondary text-sm" onClick={handleExpandMap}>
            Expand Map
          </button>
        </div>
      )}
      
      <div 
        ref={mapRef} 
        className="map-container" 
        style={{ height: containerHeight }}
      />
      
      {!isFullscreen && (
        <div className="flex gap-sm" style={{ marginTop: 'var(--spacing-sm)', justifyContent: 'center' }}>
          <div className="flex items-center gap-xs text-xs">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e' }}></span>
            <span>80+</span>
          </div>
          <div className="flex items-center gap-xs text-xs">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308' }}></span>
            <span>60-79</span>
          </div>
          <div className="flex items-center gap-xs text-xs">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }}></span>
            <span>40-59</span>
          </div>
          <div className="flex items-center gap-xs text-xs">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }}></span>
            <span>&lt;40</span>
          </div>
        </div>
      )}
    </div>
  );
}
