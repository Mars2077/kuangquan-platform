/* 空间底图组件：高德地图 JS API 2.0（主）+ 行政区划矢量渲染（降级）
 *
 * 高德 Key / 安全密钥配置位置：本文件顶部 AMAP_KEY / AMAP_SECURITY_CODE 常量。
 * 部署注意：
 *   1) Key 为 Web 端（JS API）Key，需在「高德开放平台控制台 → 应用管理 → 我的应用」中
 *      把访问域名加入白名单（含正式域名；本地调试可加 127.0.0.1/localhost）。
 *   2) 安全密钥 securityJsCode 必须以 window._AMapSecurityConfig 形式在 JS API 加载前注入，
 *      本文件在 loadAMap() 中完成；若改用代理服务器方案，则改配 serviceHost。
 *   3) 若脚本被拦截/Key 未授权，组件自动降级为本地 GeoJSON 矢量底图，功能（下钻、图层、
 *      属性卡、测量）全部保留，仅失去卫星/路网底图。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const AMAP_KEY = 'b4c7c73243192c0b2ffdf1558cb4f5a9';
export const AMAP_SECURITY_CODE = '8001ae482867d588498b444a0ac6123c';

/* ---------------------------------------------------------------- 地图脚本加载 */
let amapLoader = null;
export function loadAMap() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if (window.AMap) return Promise.resolve(window.AMap);
  if (amapLoader) return amapLoader;
  amapLoader = new Promise((resolve, reject) => {
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
    const script = document.createElement('script');
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale,AMap.ToolBar`;
    script.async = true;
    script.onload = () => (window.AMap ? resolve(window.AMap) : reject(new Error('AMap 未就绪')));
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
    setTimeout(() => {
      if (!window.AMap) reject(new Error('高德地图加载超时'));
    }, 12000);
  }).catch((e) => {
    amapLoader = null;
    throw e;
  });
  return amapLoader;
}

/* ---------------------------------------------------------------- 几何工具 */
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
  features.forEach((f) => { if (f.geometry?.coordinates) walk(f.geometry.coordinates); });
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
  return `${ring.map((p, i) => {
    const [x, y] = project(p[0], p[1]);
    return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ')} Z`;
}

function featureToPath(feature, project) {
  const g = feature.geometry;
  if (!g) return '';
  if (g.type === 'Polygon') return g.coordinates.map((r) => ringToPath(r, project)).join(' ');
  if (g.type === 'MultiPolygon') return g.coordinates.map((p) => p.map((r) => ringToPath(r, project)).join(' ')).join(' ');
  return '';
}

/** 依矿区面积生成示意范围多边形（不规则八边形，形状由 seed 决定，保证同一矿山形状稳定） */
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

/** 经纬度轨迹扁平化（MultiPolygon → 若干 Polygon） */
function polygonsOf(feature) {
  const g = feature?.geometry;
  if (!g) return [];
  if (g.type === 'Polygon') return [g.coordinates.map((r) => r.map(([lon, lat]) => [lon, lat]))];
  if (g.type === 'MultiPolygon') return g.coordinates.map((poly) => poly.map((r) => r.map(([lon, lat]) => [lon, lat])));
  return [];
}

/* ---------------------------------------------------------------- 主组件 */
export default function GeoMap({
  code = '510000',
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
  const [mode, setMode] = useState('loading'); // loading | amap | svg
  const [tip, setTip] = useState(null);
  const wrapRef = useRef(null);
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const overlaysRef = useRef([]);
  const regionsRef = useRef([]);
  const svgRef = useRef(null);

  /* ---------------- 行政区划 GeoJSON（按 code 逐级回退） */
  useEffect(() => {
    let alive = true;
    setFailed(false);
    const chain = [];
    if (/^\d{6}$/.test(String(code))) {
      chain.push(String(code));
      if (!String(code).endsWith('00')) chain.push(`${String(code).slice(0, 4)}00`);
      chain.push('510000');
    } else {
      chain.push('510000');
    }
    (async () => {
      for (const c of chain) {
        try {
          const r = await fetch(`/geo/${c}.json`);
          if (!r.ok) continue;
          const j = await r.json();
          if (!alive) return;
          if (j?.features?.length) { setGeo(j); return; }
        } catch { /* 继续尝试上一级 */ }
      }
      if (alive) setFailed(true);
    })();
    return () => { alive = false; };
  }, [code]);

  /* ---------------- 高德脚本加载（失败则降级 SVG） */
  useEffect(() => {
    let alive = true;
    loadAMap()
      .then(() => { if (alive) setMode('amap'); })
      .catch((e) => {
        console.warn('[GeoMap] 高德底图不可用，降级为矢量底图：', e?.message);
        if (alive) setMode('svg');
      });
    return () => { alive = false; };
  }, []);

  /* ---------------- 创建地图实例 */
  useEffect(() => {
    if (mode !== 'amap' || !boxRef.current || mapRef.current) return;
    const AMap = window.AMap;
    const map = new AMap.Map(boxRef.current, {
      zoom: 7,
      center: [104.0657, 30.6595],
      mapStyle: 'amap://styles/dark',
      viewMode: '2D',
      zooms: [4, 17],
      showLabel: true,
      jogEnable: false,
      resizeEnable: true,
      features: ['bg', 'road', 'building']
    });
    mapRef.current = map;
    map.on('click', (e) => {
      if (!onMapClick) return;
      onMapClick([Number(e.lnglat.getLng().toFixed(6)), Number(e.lnglat.getLat().toFixed(6))]);
    });
    const t = setTimeout(() => map.resize(), 260);
    return () => clearTimeout(t);
  }, [mode, onMapClick]);

  useEffect(() => () => {
    if (mapRef.current) { mapRef.current.destroy(); mapRef.current = null; }
  }, []);

  /* ---------------- 行政区划面 */
  useEffect(() => {
    const map = mapRef.current;
    if (mode !== 'amap' || !map || !geo) return;
    const AMap = window.AMap;
    regionsRef.current.forEach((o) => o.setMap(null));
    regionsRef.current = [];
    const polys = [];
    geo.features.forEach((f) => {
      const adcode = String(f.properties.adcode);
      const name = f.properties.name;
      polygonsOf(f).forEach((rings) => {
        const poly = new AMap.Polygon({
          path: rings,
          strokeColor: String(selectedRegion) === adcode ? 'rgba(127,227,255,0.95)' : 'rgba(126,214,255,0.62)',
          strokeWeight: String(selectedRegion) === adcode ? 2 : 1,
          fillColor: 'rgba(12,48,88,0.66)',
          fillOpacity: 0.62,
          zIndex: 30,
          bubble: true,
          cursor: 'pointer'
        });
        poly.on('click', (e) => {
          e?.originEvent?.stopPropagation?.();
          if (onDrill) onDrill(adcode);
          else if (onSelectRegion) onSelectRegion(adcode);
        });
        poly.on('mouseover', () => poly.setOptions({ fillColor: 'rgba(46,168,255,0.58)', fillOpacity: 0.72 }));
        poly.on('mouseout', () => poly.setOptions({ fillColor: 'rgba(12,48,88,0.66)', fillOpacity: 0.62 }));
        poly.on('mousemove', (e) => {
          const rect = wrapRef.current?.getBoundingClientRect();
          if (!rect) return;
          setTip({ x: e.pixel.x, y: e.pixel.y, text: name });
        });
        poly.on('mouseout', () => setTip(null));
        regionsRef.current.push(poly);
        polys.push(poly);
      });
    });
    map.add(regionsRef.current);
    if (polys.length) map.setFitView(polys, false, [70, 70, 130, 130]);
    return undefined;
  }, [mode, geo, selectedRegion, onDrill, onSelectRegion]);

  /* ---------------- 气泡 / 点位 / 选中范围 / 测量 */
  const overlaySig = useMemo(() => JSON.stringify({
    b: bubbles.map((x) => [x.code, x.value, x.lon, x.lat]),
    p: points.length,
    s: selected ? [selected.id, selected.lon, selected.lat] : null,
    m: measure?.points?.length || 0,
    mc: !!measure?.closed,
    mode
  }), [bubbles, points.length, selected, measure, mode]);

  useEffect(() => {
    const map = mapRef.current;
    if (mode !== 'amap' || !map) return;
    const AMap = window.AMap;
    overlaysRef.current.forEach((o) => o.setMap && o.setMap(null));
    overlaysRef.current = [];
    const add = (o) => { overlaysRef.current.push(o); };

    /* 选中矿区示意范围 */
    if (selected && selected.lon && selected.lat) {
      const ring = minePolygon(Number(selected.lon), Number(selected.lat), Number(selected.area_km2 || selected.area || 0.5), Number(selected.id || 1));
      add(new AMap.Polygon({
        path: ring,
        strokeColor: '#ff5f57', strokeWeight: 2, strokeStyle: 'dashed',
        fillColor: 'rgba(255,95,87,0.14)', fillOpacity: 0.5, zIndex: 90, bubble: true
      }));
    }

    /* 矿山点位 */
    points.forEach((pt) => {
      const lon = Number(pt.lon);
      const lat = Number(pt.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const isSel = selected && String(selected.id) === String(pt.id);
      const tone = markerTone(pt);
      const marker = new AMap.CircleMarker({
        center: [lon, lat],
        radius: isSel ? 7 : 4.2,
        fillColor: isSel ? '#ffffff' : tone,
        fillOpacity: 0.92,
        strokeColor: tone,
        strokeWeight: isSel ? 2 : 1,
        strokeOpacity: 0.55,
        zIndex: isSel ? 120 : 100,
        cursor: 'pointer',
        bubble: true
      });
      marker.on('click', (e) => {
        e?.originEvent?.stopPropagation?.();
        onSelectPoint?.(pt);
      });
      marker.on('mousemove', (e) => {
        const rect = wrapRef.current?.getBoundingClientRect();
        if (!rect) return;
        setTip({ x: e.pixel.x, y: e.pixel.y, text: pt.name });
      });
      marker.on('mouseout', () => setTip(null));
      add(marker);
    });

    /* 区县 / 地市聚合气泡 */
    bubbles.forEach((b) => {
      const lon = Number(b.lon);
      const lat = Number(b.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const html = `<div class="amap-bubble"><b>${b.value}</b><span>${b.name}</span></div>`;
      const marker = new AMap.Marker({
        position: [lon, lat],
        content: html,
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, 0),
        zIndex: 130,
        bubble: true,
        cursor: 'pointer'
      });
      marker.on('click', (e) => {
        e?.originEvent?.stopPropagation?.();
        onDrill?.(b.code);
      });
      add(marker);
    });

    /* 测量（测距/测面） */
    if (measure?.points?.length) {
      const path = measure.points.map(([lon, lat]) => [lon, lat]);
      if (path.length > 1) {
        add(new AMap.Polyline({
          path: measure.closed && path.length > 2 ? [...path, path[0]] : path,
          strokeColor: '#7fe3ff', strokeWeight: 2, strokeStyle: 'dashed', zIndex: 140
        }));
      }
      if (measure.closed && path.length > 2) {
        add(new AMap.Polygon({
          path, strokeColor: '#7fe3ff', strokeWeight: 1.6, fillColor: 'rgba(73,195,255,0.16)', fillOpacity: 0.4, zIndex: 135
        }));
      }
      path.forEach(([lon, lat]) => {
        add(new AMap.CircleMarker({
          center: [lon, lat], radius: 4, fillColor: '#ffffff', fillOpacity: 1,
          strokeColor: '#49c3ff', strokeWeight: 1.5, zIndex: 150
        }));
      });
    }

    overlaysRef.current.forEach((o) => o.setMap(map));
    return () => {
      overlaysRef.current.forEach((o) => o.setMap && o.setMap(null));
    };
  }, [overlaySig, mode, onSelectPoint, onDrill]);

  /* ---------------- 降级：SVG 矢量底图 */
  const proj = useMemo(() => (geo ? buildProjection(geo.features) : null), [geo]);
  const paths = useMemo(() => {
    if (!geo || !proj) return [];
    return geo.features.map((f) => ({
      adcode: f.properties.adcode,
      name: f.properties.name,
      center: f.properties.center,
      short: f.properties.short,
      d: featureToPath(f, proj.project)
    }));
  }, [geo, proj]);

  const mineRing = useMemo(() => {
    if (!selected || !proj || !selected.lon || !selected.lat) return null;
    return ringToPath(minePolygon(Number(selected.lon), Number(selected.lat), Number(selected.area_km2 || selected.area || 0.5), Number(selected.id || 1)), proj.project);
  }, [selected, proj]);

  const measurePts = useMemo(() => {
    if (!measure?.points?.length || !proj) return [];
    return measure.points.map(([lon, lat]) => proj.project(lon, lat));
  }, [measure, proj]);

  const onSvgTip = useCallback((e, text) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, text });
  }, []);

  const handleSvgClick = (e) => {
    if (!onMapClick || !proj || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scale = Math.min(rect.width / W, rect.height / H);
    const dx = (rect.width - W * scale) / 2;
    const dy = (rect.height - H * scale) / 2;
    const vx = (e.clientX - rect.left - dx) / scale;
    const vy = (e.clientY - rect.top - dy) / scale;
    if (vx < 0 || vy < 0 || vx > W || vy > H) return;
    const [lon, lat] = proj.unproject(vx, vy);
    onMapClick([Number(lon.toFixed(6)), Number(lat.toFixed(6))]);
  };

  return (
    <div ref={wrapRef} className="geomap" style={{ position: 'absolute', inset: 0 }}>
      {mode === 'amap' && <div ref={boxRef} className="geomap-canvas" style={{ position: 'absolute', inset: 0 }} />}

      {mode === 'svg' && (
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
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
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
              onMouseMove={(e) => onSvgTip(e, p.name)}
              onMouseLeave={() => setTip(null)}
            />
          ))}
          {mineRing && <path d={mineRing} className="geo-mine-poly" />}
          {proj && points.map((pt) => {
            if (!pt.lon || !pt.lat) return null;
            const [x, y] = proj.project(Number(pt.lon), Number(pt.lat));
            const isSel = selected && String(selected.id) === String(pt.id);
            const tone = markerTone(pt);
            return (
              <g key={`${pt.id}-${pt.name}`} transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onSelectPoint?.(pt); }}
                onMouseMove={(e) => onSvgTip(e, pt.name)} onMouseLeave={() => setTip(null)}>
                <circle r={isSel ? 9 : 5} fill={tone} opacity={0.2} filter="url(#softGlow)" />
                <circle r={isSel ? 3.6 : 2.3} fill={isSel ? '#ffffff' : tone} />
              </g>
            );
          })}
          {proj && bubbles.map((b) => {
            const path = paths.find((p) => String(p.adcode).slice(0, 6) === String(b.code).slice(0, 6));
            const center = path?.center || (b.lon && b.lat ? [b.lon, b.lat] : null);
            if (!center) return null;
            const [x, y] = proj.project(center[0], center[1]);
            return (
              <g key={b.code} transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); onDrill?.(b.code); }}
                onMouseMove={(e) => onSvgTip(e, `${b.name} · ${b.value} 座矿山`)} onMouseLeave={() => setTip(null)}>
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
                  stroke="#7fe3ff" strokeWidth="1.4" strokeDasharray="5 4"
                />
              )}
              {measurePts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3" fill="#ffffff" stroke="#49c3ff" strokeWidth="1.2" />
              ))}
            </g>
          )}
        </svg>
      )}

      {mode === 'loading' && (
        <div className="loading" style={{ position: 'absolute', inset: 0, zIndex: 3 }}>
          <span className="spinner" />
          {failed ? '空间底图加载失败，请检查网络或静态资源' : '正在加载空间底图 …'}
        </div>
      )}

      {tip && <div className="geo-tip" style={{ left: tip.x, top: tip.y }}>{tip.text}</div>}

      <div className="map-legend" style={{ position: 'absolute', right: 12, bottom: 206, display: 'flex', gap: 10, fontSize: 11, color: '#8fb4d9' }}>
        <span><i style={{ background: '#49c3ff' }} />矿业权</span>
        <span><i style={{ background: '#35d39a' }} />生产矿山</span>
        <span><i style={{ background: '#ffcc44' }} />探矿权</span>
      </div>
    </div>
  );
}
