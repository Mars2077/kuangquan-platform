import React, { useEffect, useMemo, useRef, useState } from 'react';

const W = 1000;
const H = 620;
const PAD = 26;

function collectCoords(features) {
  let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const walk = (arr) => {
    if (typeof arr[0] === 'number') {
      const [lon, lat] = arr;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      return;
    }
    arr.forEach(walk);
  };
  features.forEach((f) => {
    if (f.geometry?.coordinates) walk(f.geometry.coordinates);
  });
  return { minLon, maxLon, minLat, maxLat };
}

function buildProjection(features) {
  const b = collectCoords(features);
  const spanLon = Math.max(0.0001, b.maxLon - b.minLon);
  const spanLat = Math.max(0.0001, b.maxLat - b.minLat);
  const s = Math.min((W - PAD * 2) / spanLon, (H - PAD * 2) / spanLat);
  const offX = (W - spanLon * s) / 2;
  const offY = (H - spanLat * s) / 2;
  return {
    bbox: b,
    scale: s,
    project: (lon, lat) => [offX + (lon - b.minLon) * s, offY + (b.maxLat - lat) * s],
    unproject: (x, y) => [b.minLon + (x - offX) / s, b.maxLat - (y - offY) / s]
  };
}

function ringToPath(ring, project) {
  return (
    ring
      .map((p, i) => {
        const [x, y] = project(p[0], p[1]);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ') + ' Z'
  );
}

function featureToPath(feature, project) {
  const g = feature.geometry;
  if (!g) return '';
  if (g.type === 'Polygon') return g.coordinates.map((r) => ringToPath(r, project)).join(' ');
  if (g.type === 'MultiPolygon') return g.coordinates.map((p) => p.map((r) => ringToPath(r, project)).join(' ')).join(' ');
  return '';
}

/** 依矿区面积生成示意范围多边形（不规则八边形，形状由 id 决定，保证同一矿山形状稳定） */
export function minePolygon(lon, lat, areaKm2, seed = 1) {
  const rkm = Math.max(0.14, Math.sqrt(Math.max(0.02, areaKm2 || 0.3) / Math.PI));
  const ring = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + (seed % 7) * 0.11;
    const jitter = 0.78 + ((Math.sin(seed * 12.9898 + i * 4.1414) + 1) / 2) * 0.44;
    const dr = rkm * jitter;
    const dLat = dr / 110.57;
    const dLon = dr / (111.32 * Math.cos((lat * Math.PI) / 180) || 1);
    ring.push([lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat]);
  }
  return ring;
}

const TONE = { 生产中: '#35d39a', 探矿权: '#ffcc44', default: '#49c3ff' };
const markerTone = (pt) => {
  if (pt?.tone) return pt.tone;
  if (pt?.status === '生产中') return TONE.生产中;
  if (pt?.right_type === '探矿权') return TONE.探矿权;
  if (pt?.level === '一级' || pt?.level === '二级') return '#ff5f57';
  if (pt?.stage === '规划') return '#ff8a3d';
  return TONE.default;
};

export default function GeoMap({
  code = '330000',
  onDrill,
  bubbles = [],
  points = [],
  selected,
  onSelectPoint,
  onSelectRegion,
  selectedRegion,
  onMapClick,
  measure,
  showRings = true,
  height = 620
}) {
  const [geo, setGeo] = useState(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState(null);
  const [tip, setTip] = useState(null);
  const wrapRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    const chain = [];
    if (/^\d{6}$/.test(String(code))) {
      chain.push(String(code));
      if (!String(code).endsWith('00')) chain.push(`${String(code).slice(0, 4)}00`);
      chain.push('330000');
    } else {
      chain.push('330000');
    }
    (async () => {
      for (const c of chain) {
        try {
          const r = await fetch(`/geo/${c}.json`);
          if (!r.ok) continue;
          const j = await r.json();
          if (!alive) return;
          if (j?.features?.length) {
            setGeo(j);
            return;
          }
        } catch {
          /* 继续尝试上一级 */
        }
      }
      if (alive) setFailed(true);
    })();
    return () => {
      alive = false;
    };
  }, [code]);

  const proj = useMemo(() => (geo ? buildProjection(geo.features) : null), [geo]);

  const paths = useMemo(() => {
    if (!geo || !proj) return [];
    return geo.features.map((f) => ({
      adcode: f.properties.adcode,
      name: f.properties.name,
      center: f.properties.center,
      d: featureToPath(f, proj.project)
    }));
  }, [geo, proj]);

  const onMove = (e, text) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text });
  };

  const mineRing = useMemo(() => {
    if (!selected || !proj || !selected.lon || !selected.lat) return null;
    const ring = minePolygon(
      Number(selected.lon),
      Number(selected.lat),
      Number(selected.area_km2 || selected.area || 0.5),
      Number(selected.id || 1)
    );
    return ringToPath(ring, proj.project);
  }, [selected, proj]);

  const measurePts = useMemo(() => {
    if (!measure?.points?.length || !proj) return [];
    return measure.points.map(([lon, lat]) => proj.project(lon, lat));
  }, [measure, proj]);

  const handleSvgClick = (e) => {
    if (!onMapClick || !proj) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H);
    const usedW = W * scale;
    const usedH = H * scale;
    const dx = (rect.width - usedW) / 2;
    const dy = (rect.height - usedH) / 2;
    const vx = (e.clientX - rect.left - dx) / scale;
    const vy = (e.clientY - rect.top - dy) / scale;
    if (vx < 0 || vy < 0 || vx > W || vy > H) return;
    const [lon, lat] = proj.unproject(vx, vy);
    onMapClick([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  };

  return (
    <div ref={wrapRef} style={{ position: 'absolute', inset: 0 }}>
      {!geo && (
        <div className="loading" style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
          <span className="spinner" />
          {failed ? '空间底图加载失败，请检查网络或静态资源' : '正在加载空间底图 …'}
        </div>
      )}
      <svg
        ref={svgRef}
        className="geo-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="行政区划空间底图"
        onClick={handleSvgClick}
      >
        <defs>
          <radialGradient id="mapGlow" cx="50%" cy="46%" r="56%">
            <stop offset="0%" stopColor="#1d5c93" stopOpacity="0.72" />
            <stop offset="62%" stopColor="#0b2745" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#050f21" stopOpacity="0" />
          </radialGradient>
          <filter id="softGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx={W / 2} cy={H / 2} rx={W * 0.47} ry={H * 0.46} fill="url(#mapGlow)" />
        {showRings && (
          <>
            <ellipse className="geo-ring" cx={W / 2} cy={H / 2} rx={W * 0.4} ry={H * 0.39} />
            <ellipse className="geo-ring" cx={W / 2} cy={H / 2} rx={W * 0.455} ry={H * 0.445} />
          </>
        )}

        {paths.map((p) => (
          <path
            key={p.adcode}
            d={p.d}
            className={`geo-region${String(selectedRegion) === String(p.adcode) ? ' on' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              if (onDrill) onDrill(p.adcode);
              else if (onSelectRegion) onSelectRegion(p.adcode);
            }}
            onMouseEnter={() => setHover(p.adcode)}
            onMouseLeave={() => {
              setHover(null);
              setTip(null);
            }}
            onMouseMove={(e) => onMove(e, p.name)}
          />
        ))}

        {mineRing && <path d={mineRing} className="geo-mine-poly" />}

        {proj &&
          points.map((pt) => {
            if (!pt.lon || !pt.lat) return null;
            const [x, y] = proj.project(Number(pt.lon), Number(pt.lat));
            const isSel = selected && String(selected.id) === String(pt.id);
            const tone = markerTone(pt);
            return (
              <g
                key={`${pt.id}-${pt.name}`}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPoint?.(pt);
                }}
                onMouseMove={(e) => onMove(e, pt.name)}
                onMouseLeave={() => setTip(null)}
              >
                <circle r={isSel ? 9 : 5} fill={tone} opacity={0.2} filter="url(#softGlow)" />
                <circle r={isSel ? 3.6 : 2.3} fill={isSel ? '#ffffff' : tone} />
              </g>
            );
          })}

        {proj &&
          bubbles.map((b) => {
            const path = paths.find((p) => String(p.adcode).slice(0, 6) === String(b.code).slice(0, 6));
            const center = path?.center || (b.lon && b.lat ? [b.lon, b.lat] : null);
            if (!center) return null;
            const [x, y] = proj.project(center[0], center[1]);
            return (
              <g
                key={b.code}
                transform={`translate(${x},${y})`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation();
                  onDrill?.(b.code);
                }}
                onMouseMove={(e) => onMove(e, `${b.name} · ${b.value} 座矿山`)}
                onMouseLeave={() => setTip(null)}
              >
                <circle r="17" fill="rgba(46,168,255,0.14)" stroke="rgba(126,214,255,0.42)" strokeWidth="0.6" />
                <circle r="9.5" fill="rgba(24,86,150,0.92)" stroke="rgba(160,235,255,0.9)" strokeWidth="0.8" />
                <text className="geo-num" y="1" style={{ fontSize: '7.6px' }}>{b.value}</text>
                <text className="geo-num" y="-21" style={{ fontSize: '8.2px', fill: '#d5ecff' }}>{b.name}</text>
              </g>
            );
          })}

        {measurePts.length > 0 && (
          <g>
            {measurePts.length > 1 && (
              <polyline
                points={measurePts.map(([x, y]) => `${x},${y}`).join(' ')}
                fill={measure?.closed ? 'rgba(73,195,255,0.14)' : 'none'}
                stroke="#7fe3ff"
                strokeWidth="1.4"
                strokeDasharray="5 4"
              />
            )}
            {measurePts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="#ffffff" stroke="#49c3ff" strokeWidth="1.2" />
            ))}
            {measure?.closed && measurePts.length > 2 && (
              <line
                x1={measurePts[measurePts.length - 1][0]}
                y1={measurePts[measurePts.length - 1][1]}
                x2={measurePts[0][0]}
                y2={measurePts[0][1]}
                stroke="#7fe3ff"
                strokeWidth="1.4"
                strokeDasharray="5 4"
              />
            )}
          </g>
        )}
      </svg>

      {tip && <div className="geo-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}

      <div className="map-legend" style={{ position: 'absolute', right: 12, bottom: 206, display: 'flex', gap: 10, fontSize: 11, color: '#8fb4d9' }}>
        <span><i style={{ background: '#49c3ff' }} />矿业权</span>
        <span><i style={{ background: '#35d39a' }} />生产矿山</span>
        <span><i style={{ background: '#ffcc44' }} />探矿权</span>
      </div>
    </div>
  );
}
