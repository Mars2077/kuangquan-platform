/* 地图舞台：高德底图（在线）与本地 GeoJSON 矢量底图（降级）双模式。
 * v3：根容器为契约 §5 的 .dash-map（flex 纵向铺满，不再写死 height）；
 *     内部全部使用内联样式/SVG 属性，不再依赖 widgets.css 的 .geo-* / .amap-* 类。
 * 对外交互：下钻、点位选择、气泡、测距/测面点、点击取坐标。
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const AMAP_KEY = 'b4c7c73243192c0b2ffdf1558cb4f5a9';
const AMAP_SECURITY_CODE = '8001ae482867d588498b444a0ac6123c';

const VIEW_W = 1000;
const VIEW_H = 620;
const PAD = 26;

const CYAN = '#49c3ff';
const CYAN_2 = '#7fe3ff';
const TEXT_1 = '#eaf4ff';
const TEXT_3 = '#8fb0cc';
const TEXT_4 = '#5d7d99';
// 卫星影像之上的暗色蒙版：压暗辖区、保证青色描边与白字可读，同时让地形透出来。
const MASK_FILL = '#061a34';
const MASK_FILL_HOVER = '#0a2b4d';
const MASK_FILL_ON = '#0d3f70';
const STAGE_TONE = { 待查: '#7fa6cc', 在查: '#ffcc44', 查明: '#35d39a', 规划: '#ff8a3d' };

/* ---------------------------------------------------------------- 高德加载 */
function loadAMap() {
  if (window.AMap) return Promise.resolve(window.AMap);
  if (!window.__kqAmapPromise) {
    window.__kqAmapPromise = new Promise((resolve, reject) => {
      window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
      const script = document.createElement('script');
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.Scale,AMap.ToolBar`;
      script.async = true;
      const timer = setTimeout(() => {
        window.__kqAmapPromise = null;
        reject(new Error('高德底图加载超时'));
      }, 12000);
      script.onload = () => {
        clearTimeout(timer);
        if (window.AMap) resolve(window.AMap);
        else {
          window.__kqAmapPromise = null;
          reject(new Error('高德底图不可用'));
        }
      };
      script.onerror = () => {
        clearTimeout(timer);
        window.__kqAmapPromise = null;
        reject(new Error('高德底图加载失败'));
      };
      document.head.appendChild(script);
    });
  }
  return window.__kqAmapPromise;
}

/* ---------------------------------------------------------------- 几何工具 */
const fmtNum = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? '');
  return n.toLocaleString('zh-CN', { maximumFractionDigits: 0 });
};

const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
));

/* 点位色：显式色优先，其次按状态/权类/等级/勘查阶段推导 */
function markerTone(p = {}) {
  if (p.color) return p.color;
  if (p.tone && /^#/.test(String(p.tone))) return p.tone;
  if (p.status === '生产中') return '#35d39a';
  if (p.right_type === '探矿权') return '#ffcc44';
  if (p.level === '一级' || p.level === '二级' || p.level === '红色') return '#ff5f57';
  if (p.level === '黄色') return '#ffcc44';
  if (p.stage && STAGE_TONE[p.stage]) return STAGE_TONE[p.stage];
  return CYAN;
}

/* 矿区范围示意多边形（8 边不规则环，面积近似） */
function minePolygon(lon, lat, areaKm2, seed = 1) {
  const area = Math.max(0.15, Number(areaKm2) || 0.6);
  const rDeg = Math.sqrt(area / Math.PI) / 111;
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
  const pts = [];
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2;
    const wobble = 0.68 + ((Math.sin(seed * 12.9898 + i * 78.233) + 1) / 2) * 0.62;
    const r = rDeg * wobble;
    pts.push([lon + (Math.cos(ang) * r) / cosLat, lat + Math.sin(ang) * r]);
  }
  return pts;
}

function parseGeo(json) {
  const feats = Array.isArray(json?.features) ? json.features : [];
  return feats.map((f) => {
    const props = f.properties || {};
    const rings = [];
    const pushRing = (ring) => {
      if (Array.isArray(ring) && ring.length > 2) rings.push(ring);
    };
    const g = f.geometry || {};
    if (g.type === 'Polygon') (g.coordinates || []).forEach(pushRing);
    else if (g.type === 'MultiPolygon') (g.coordinates || []).forEach((poly) => (poly || []).forEach(pushRing));
    return {
      adcode: String(props.adcode ?? props.code ?? props.ADCODE ?? ''),
      name: props.name || props.NAME || '',
      rings
    };
  }).filter((f) => f.rings.length > 0);
}

function buildProjection(coords) {
  if (!coords.length) return null;
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  coords.forEach(([lon, lat]) => {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  });
  if (!Number.isFinite(minLon) || !Number.isFinite(minLat)) return null;
  const spanLon = Math.max(0.02, maxLon - minLon);
  const spanLat = Math.max(0.02, maxLat - minLat);
  const cx = (minLon + maxLon) / 2;
  const cy = (minLat + maxLat) / 2;
  const cosLat = Math.cos((cy * Math.PI) / 180) || 1;
  const scale = Math.min((VIEW_W - PAD * 2) / (spanLon * cosLat), (VIEW_H - PAD * 2) / spanLat);
  return {
    project: (lon, lat) => [VIEW_W / 2 + (lon - cx) * cosLat * scale, VIEW_H / 2 - (lat - cy) * scale],
    unproject: (x, y) => [cx + (x - VIEW_W / 2) / (cosLat * scale), cy - (y - VIEW_H / 2) / scale]
  };
}

const ringPath = (ring, project) => ring.map((pt, i) => {
  const [x, y] = project(pt[0], pt[1]);
  return `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
}).join(' ') + ' Z';

const ringPoints = (ring, project) => ring.map((pt) => {
  const [x, y] = project(pt[0], pt[1]);
  return `${x.toFixed(2)},${y.toFixed(2)}`;
}).join(' ');

/* ---------------------------------------------------------------- 组件 */
export default function GeoMap({
  code = '510000',
  onDrill,
  bubbles = [],
  points = [],
  selected = null,
  onSelectPoint,
  onSelectRegion,
  selectedRegion,
  onMapClick,
  measure = { mode: 'none', points: [] },
  showRings = true,
  style,
  children
}) {
  const stageRef = useRef(null);
  const boxRef = useRef(null);
  const svgRef = useRef(null);
  const mapRef = useRef(null);
  const polygonsRef = useRef([]);
  const overlaysRef = useRef([]);

  const [mode, setMode] = useState('loading');
  /* 地图完成一帧/瓦片就绪后自增一次，用于强制重建覆盖物：
     静态部署时数据快照可能比地图实例更早到达，覆盖物 effect 会以空数组跑过一次，
     之后 props 引用未变化就不会重跑，表现为「有底图和省界但没有气泡与点位」。 */
  const [mapTick, setMapTick] = useState(0);
  /* zoom 分级：省级视角只显示聚合数量，放大后才铺具体矿点 */
  const zoomRef = useRef(7);
  const [zoomTick, setZoomTick] = useState(0);
  const [geo, setGeo] = useState(null);
  const [geoReady, setGeoReady] = useState(false);
  const [tip, setTip] = useState(null);

  /* 气泡文字防重叠：只在数值最大的若干个气泡上显示地名，其余靠悬浮提示 */
  const bubbleLabelSet = useMemo(() => {
    const arr = (bubbles || []).filter((b) => Number.isFinite(Number(b.value)) && b.name);
    const top = [...arr]
      .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
      .slice(0, 12);
    return new Set(top.map((b) => String(b.code || b.name)));
  }, [bubbles]);
  const showBubbleName = (b) => bubbleLabelSet.has(String(b.code || b.name));

  /* 回调放进 ref，避免父组件每次渲染都重建地图 */
  const cbRef = useRef({});
  cbRef.current = { onDrill, onSelectPoint, onSelectRegion, onMapClick };

  const selectRegion = String(selectedRegion || code || '');

  /* -------- 1. 高德加载（失败降级矢量） -------- */
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

  /* -------- 2. 本地 GeoJSON：逐级回退 -------- */
  useEffect(() => {
    let alive = true;
    setGeoReady(false);
    setGeo(null);
    const c = String(code || '510000');
    const tries = [...new Set([c, `${c.slice(0, 4)}00`, '510000'])];
    (async () => {
      for (let i = 0; i < tries.length; i += 1) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const res = await fetch(`/geo/${tries[i]}.json`);
          if (!res.ok) continue;
          // eslint-disable-next-line no-await-in-loop
          const json = await res.json();
          const features = parseGeo(json);
          if (features.length) {
            if (alive) {
              setGeo({ features, source: tries[i] });
              setGeoReady(true);
            }
            return;
          }
        } catch {
          /* 继续尝试下一级 */
        }
      }
      if (alive) setGeo({ features: [], source: '' });
    })();
    return () => { alive = false; };
  }, [code]);

  const features = geo?.features || [];

  const projection = useMemo(() => {
    const coords = [];
    features.forEach((f) => f.rings.forEach((ring) => ring.forEach((pt) => coords.push(pt))));
    if (!coords.length) {
      [...points, ...bubbles].forEach((p) => {
        const lon = Number(p.lon);
        const lat = Number(p.lat);
        if (Number.isFinite(lon) && Number.isFinite(lat)) coords.push([lon, lat]);
      });
    }
    return buildProjection(coords);
  }, [features, points, bubbles]);

  /* -------- 3. 高德实例：行政区面 -------- */
  useEffect(() => {
    if (mode !== 'amap' || !features.length || !boxRef.current) return undefined;
    const AMap = window.AMap;
    let map = null;
    let fitTimer = null;
    try {
      map = new AMap.Map(boxRef.current, {
        zoom: 7,
        viewMode: '2D',
        mapStyle: 'amap://styles/dark',
        // 高德把「国界线」并入 road 特征组渲染：dark 样式下西南段国界线是红色虚线，
        // 位置正对四川西侧（察隅/米什米一带），在厅演示时会被误读成告警。
        // 本专题图不需要底图道路，去掉 road 组即可彻底移除红线；保留 bg（陆地/水域）与 point（地名）。
        features: ['bg', 'point'],
        resizeEnable: true,
        showLabel: true
      });
      mapRef.current = map;
      window.__kqMap = map; // 调试/自检用：暴露当前高德实例
      // 卫星影像底图：参考截图的观感是「深色影像 + 晕渲地形」，纯色底图太空。
      // 瓦片层置于最底层（行政区 Polygon/点位/气泡都画在图层之上），失败只告警、不降级整块地图。
      try {
        const sat = new AMap.TileLayer.Satellite({ zIndex: 1, opacity: 0.45, zooms: [4, 17] });
        sat.setMap(map);
      } catch (e) {
        console.warn('[GeoMap] 卫星影像层加载失败，沿用深色底图：', e?.message);
      }
      map.on('click', (e) => {
        if (e?.lnglat) cbRef.current.onMapClick?.([e.lnglat.getLng(), e.lnglat.getLat()]);
      });
      /* 缩放分级：缩小时只显示「数量气泡」聚合，放大到 8 级才显示具体矿点，
       * 避免省级视角 400+ 个点位糊成一片（用户要求 5）。 */
      const onZoom = () => {
        zoomRef.current = map.getZoom();
        setZoomTick((n) => n + 1);
      };
      map.on('zoomend', onZoom);
      const polygons = [];
      features.forEach((f) => {
        f.rings.forEach((ring) => {
          const poly = new AMap.Polygon({
            path: ring.map(([lon, lat]) => [lon, lat]),
            fillColor: MASK_FILL,
            /* 深色掩膜已去掉：填充仅保留极低不透明度用于承接点击，视觉上不压暗卫星影像 */
            fillOpacity: 0.001,
            strokeColor: CYAN,
            strokeOpacity: 0.62,
            strokeWeight: 1.2,
            zIndex: 5
          });
          poly.on('click', () => cbRef.current.onDrill?.(f.adcode));
          poly.on('mouseover', () => {
            poly.setOptions({ fillColor: MASK_FILL_HOVER, fillOpacity: 0.12 });
            if (f.name) setTip({ fixed: true, text: f.name });
          });
          poly.on('mouseout', () => {
            const on = String(f.adcode) === selectRegion;
            poly.setOptions({
              fillColor: on ? MASK_FILL_ON : MASK_FILL,
              fillOpacity: on ? 0.16 : 0.001
            });
            setTip(null);
          });
          polygons.push({ poly, adcode: f.adcode });
        });
      });
      polygonsRef.current = polygons;
      if (polygons.length) {
        map.add(polygons.map((p) => p.poly));
        // 用要素自带经纬度包围盒算视野，等底图 complete 后再设一次：
        // 高德首次 setFitView 常在容器尺寸/底图未就绪时失效，导致视野落在辖区之外。
        let minLon = 180;
        let maxLon = -180;
        let minLat = 90;
        let maxLat = -90;
        features.forEach((f) => {
          (f.rings || []).forEach((ring) => {
            ring.forEach(([lon, lat]) => {
              if (lon < minLon) minLon = lon;
              if (lon > maxLon) maxLon = lon;
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
            });
          });
        });
        let fitted = false;
        const fit = () => {
          if (fitted || !mapRef.current) return;
          fitted = true;
          try {
            if (Number.isFinite(minLon) && maxLon > minLon) {
              const padX = (maxLon - minLon) * 0.06;
              const padY = (maxLat - minLat) * 0.08;
              map.setBounds(
                new AMap.Bounds([minLon - padX, minLat - padY], [maxLon + padX, maxLat + padY]),
                true,
                [24, 24, 24, 24]
              );
            } else {
              map.setFitView(polygons.map((p) => p.poly), true, [24, 24, 24, 24]);
            }
          } catch {
            /* ignore */
          }
        };
        fit();
        fitTimer = setTimeout(fit, 260);
        map.once('complete', fit);
      } else {
        map.setZoomAndCenter(7, [104.07, 30.65]);
      }
      setTip(null);
    } catch (e) {
      console.warn('[GeoMap] 高德地图初始化失败，降级为矢量底图：', e?.message);
      setMode('svg');
      return undefined;
    }
    const ro = new ResizeObserver(() => {
      if (mapRef.current) mapRef.current.resize();
    });
    if (boxRef.current) ro.observe(boxRef.current);
    /* 覆盖物重建触发器：complete 事件 + 1.4s 兜底各触发一次 */
    const bumpTick = () => setMapTick((n) => n + 1);
    const bumpTimer = setTimeout(bumpTick, 1400);
    try { map.on('complete', bumpTick); } catch { /* ignore */ }
    return () => {
      ro.disconnect();
      if (fitTimer) clearTimeout(fitTimer);
      clearTimeout(bumpTimer);
      try { map.off('complete', bumpTick); } catch { /* ignore */ }
      polygonsRef.current = [];
      overlaysRef.current = [];
      if (map) {
        try { map.destroy(); } catch { /* ignore */ }
      }
      mapRef.current = null;
    };
    // selectRegion 只用于初始化时的选中态，不触发重建
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, features]);

  /* 选中行政区高亮 */
  useEffect(() => {
    polygonsRef.current.forEach(({ poly, adcode }) => {
      const on = String(adcode) === selectRegion;
      poly.setOptions({
        fillColor: on ? MASK_FILL_ON : MASK_FILL,
        fillOpacity: on ? 0.16 : 0.001,
        strokeColor: on ? CYAN_2 : CYAN,
        strokeWeight: on ? 2 : 1
      });
    });
  }, [mode, selectRegion, features]);

  /* -------- 4. 高德覆盖物：点位 / 气泡 / 测量 -------- */
  useEffect(() => {
    if (mode !== 'amap') return undefined;
    const map = mapRef.current;
    if (!map) return undefined;
    const AMap = window.AMap;
    const created = [];

    const showPoints = zoomRef.current >= 8;

    (showPoints ? points || [] : []).forEach((p) => {
      const lon = Number(p.lon);
      const lat = Number(p.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const tone = markerTone(p);
      const isSel = selected && String(selected.id) === String(p.id);
      const dot = new AMap.CircleMarker({
        center: [lon, lat],
        radius: isSel ? 8 : 5,
        strokeColor: '#050e1c',
        strokeWeight: 1,
        strokeOpacity: 0.9,
        fillColor: tone,
        fillOpacity: 0.92,
        zIndex: 120,
        cursor: 'pointer'
      });
      dot.on('click', () => cbRef.current.onSelectPoint?.(p));
      map.add(dot);
      created.push(dot);
    });

    (bubbles || []).forEach((b) => {
      const lon = Number(b.lon);
      const lat = Number(b.lat);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const tone = CYAN_2;
      const nameHtml = showBubbleName(b)
        ? `<span style="font:500 9px/1.2 system-ui,-apple-system,'Segoe UI',sans-serif;color:${TEXT_3};`
          + `text-shadow:0 1px 4px rgba(2,8,18,.9)">${escapeHtml(b.name)}</span>`
        : '';
      const html = `<div class="amap-bubble" style="display:flex;flex-direction:column;align-items:center;gap:2px;`
        + `transform:translate(-50%,-50%);cursor:pointer;white-space:nowrap">`
        + nameHtml
        + `<span title="${escapeHtml(b.name)}" style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;`
        + `padding:1px 6px;border-radius:8px;background:rgba(5,14,28,.86);border:1px solid ${tone};`
        + `color:${tone};font:600 10px/1.3 system-ui,-apple-system,'Segoe UI',sans-serif;`
        + `box-shadow:0 2px 10px rgba(2,8,18,.55)">${escapeHtml(fmtNum(b.value))}</span></div>`;
      const marker = new AMap.Marker({
        position: [lon, lat],
        content: html,
        offset: new AMap.Pixel(0, 0),
        zIndex: 110
      });
      marker.on('click', () => {
        if (b.code && String(b.code) !== String(code)) cbRef.current.onDrill?.(b.code);
        else cbRef.current.onSelectRegion?.(b);
      });
      map.add(marker);
      created.push(marker);
    });

    const mPts = (measure?.points || []).filter((pt) => pt && pt.length >= 2);
    if (measure?.mode !== 'none' && mPts.length) {
      const line = new AMap.Polyline({
        path: mPts.map(([lon, lat]) => [lon, lat]),
        strokeColor: '#ffcc44',
        strokeWeight: 2,
        strokeOpacity: 0.95,
        zIndex: 130
      });
      map.add(line);
      created.push(line);
      if (measure.mode === 'area' && mPts.length >= 3) {
        const poly = new AMap.Polygon({
          path: mPts.map(([lon, lat]) => [lon, lat]),
          fillColor: '#ffcc44',
          fillOpacity: 0.12,
          strokeColor: '#ffcc44',
          strokeWeight: 1.6,
          strokeOpacity: 0.9,
          zIndex: 125
        });
        map.add(poly);
        created.push(poly);
      }
      mPts.forEach(([lon, lat]) => {
        const v = new AMap.CircleMarker({
          center: [lon, lat],
          radius: 4,
          fillColor: '#ffcc44',
          fillOpacity: 1,
          strokeColor: '#050e1c',
          strokeWeight: 1,
          zIndex: 135
        });
        map.add(v);
        created.push(v);
      });
    }

    overlaysRef.current = created;
    return () => {
      created.forEach((o) => {
        try { map.remove(o); } catch { /* ignore */ }
      });
      overlaysRef.current = [];
    };
  }, [mode, points, bubbles, selected, measure, code, mapTick, zoomTick]);

  const measurePoints = measure?.points || [];
  const measureMode = measure?.mode || 'none';

  const handleSvgClick = useCallback((e) => {
    const svg = svgRef.current;
    if (!svg || !projection) return;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    const [lon, lat] = projection.unproject(loc.x, loc.y);
    cbRef.current.onMapClick?.([lon, lat]);
  }, [projection]);

  const handleRegionEnter = (e, name) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left + 12, y: e.clientY - box.top + 12, text: name });
  };

  const hasGeo = features.length > 0;

  return (
    <div className="dash-map" style={style}>
      <div
        ref={stageRef}
        style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, overflow: 'hidden' }}
      >
        {mode === 'amap' && (
          <div
            ref={boxRef}
            data-amap-canvas="1"
            style={{ position: 'absolute', inset: 0 }}
          />
        )}

        {mode !== 'amap' && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 44%, rgba(10,31,54,0.92), #050e1c 72%)'
          }}>
            {projection && hasGeo ? (
              <svg
                ref={svgRef}
                data-geo-svg="1"
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                style={{ width: '100%', height: '100%', display: 'block' }}
                onClick={handleSvgClick}
                role="img"
                aria-label="行政区划专题图"
              >
                <defs>
                  <radialGradient id="kq-map-glow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="rgba(46,168,255,0.30)" />
                    <stop offset="100%" stopColor="rgba(46,168,255,0)" />
                  </radialGradient>
                </defs>
                <ellipse cx={VIEW_W / 2} cy={VIEW_H / 2} rx={VIEW_W * 0.46} ry={VIEW_H * 0.4} fill="url(#kq-map-glow)" />
                {showRings && [0.74, 0.96].map((k, i) => (
                  <ellipse
                    key={k}
                    cx={VIEW_W / 2}
                    cy={VIEW_H / 2}
                    rx={VIEW_W * 0.42 * k}
                    ry={VIEW_H * 0.36 * k}
                    fill="none"
                    stroke="rgba(73,195,255,0.16)"
                    strokeWidth="1"
                    strokeDasharray={i ? '2 7' : 'none'}
                  />
                ))}

                {/* 行政区面 */}
                {features.map((f) => {
                  const on = String(f.adcode) === selectRegion;
                  return (
                    <g key={f.adcode || f.name}>
                      {f.rings.map((ring, ri) => (
                        <path
                          key={ri}
                          d={ringPath(ring, projection.project)}
                          fill={on ? 'rgba(73,195,255,0.20)' : 'rgba(46,168,255,0.08)'}
                          stroke={on ? CYAN_2 : 'rgba(73,195,255,0.42)'}
                          strokeWidth={on ? 1.6 : 1}
                          style={{ cursor: 'pointer', transition: 'fill .16s ease' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            cbRef.current.onDrill?.(f.adcode);
                          }}
                          onMouseEnter={(e) => handleRegionEnter(e, f.name)}
                          onMouseMove={(e) => handleRegionEnter(e, f.name)}
                          onMouseLeave={() => setTip(null)}
                        />
                      ))}
                    </g>
                  );
                })}

                {/* 矿区范围示意 */}
                {points.map((p) => {
                  const lon = Number(p.lon);
                  const lat = Number(p.lat);
                  if (!Number.isFinite(lon) || !Number.isFinite(lat) || !p.area) return null;
                  const tone = markerTone(p);
                  return (
                    <path
                      key={`poly-${p.id ?? `${lon}-${lat}`}`}
                      d={ringPath(minePolygon(lon, lat, p.area, Number(p.id) || 1), projection.project)}
                      fill={`${tone}1f`}
                      stroke={`${tone}b3`}
                      strokeWidth="0.9"
                      pointerEvents="none"
                    />
                  );
                })}

                {/* 点位 */}
                {points.map((p) => {
                  const lon = Number(p.lon);
                  const lat = Number(p.lat);
                  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
                  const [x, y] = projection.project(lon, lat);
                  const tone = markerTone(p);
                  const isSel = selected && String(selected.id) === String(p.id);
                  return (
                    <g
                      key={`pt-${p.id ?? `${lon}-${lat}`}`}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        cbRef.current.onSelectPoint?.(p);
                      }}
                    >
                      <circle cx={x} cy={y} r={isSel ? 9 : 6.5} fill={tone} opacity="0.22" />
                      <circle
                        cx={x}
                        cy={y}
                        r={isSel ? 4.6 : 3.2}
                        fill={tone}
                        stroke="#050e1c"
                        strokeWidth="0.8"
                      />
                    </g>
                  );
                })}

                {/* 聚合气泡 */}
                {bubbles.map((b) => {
                  const lon = Number(b.lon);
                  const lat = Number(b.lat);
                  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
                  const [x, y] = projection.project(lon, lat);
                  const r = Math.min(20, 6 + Math.sqrt(Math.max(0, Number(b.value) || 0)) * 1.05);
                  const clickable = b.code && String(b.code) !== String(code);
                  return (
                    <g
                      key={`bub-${b.code || b.name}`}
                      style={{ cursor: clickable ? 'pointer' : 'default' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (clickable) cbRef.current.onDrill?.(b.code);
                        else cbRef.current.onSelectRegion?.(b);
                      }}
                    >
                      <title>{`${b.name}：${fmtNum(b.value)}`}</title>
                      <circle cx={x} cy={y} r={r} fill="rgba(73,195,255,0.12)" stroke="rgba(73,195,255,0.55)" strokeWidth="1" />
                      <text
                        x={x}
                        y={y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={TEXT_1}
                        fontSize="10"
                        fontWeight="600"
                      >
                        {fmtNum(b.value)}
                      </text>
                      {showBubbleName(b) ? (
                        <text x={x} y={y - r - 5} textAnchor="middle" fill={TEXT_3} fontSize="9">
                          {b.name}
                        </text>
                      ) : null}
                    </g>
                  );
                })}

                {/* 测距 / 测面 */}
                {measureMode !== 'none' && measurePoints.length > 0 && (
                  <g>
                    {measureMode === 'area' && measurePoints.length >= 3 && (
                      <polygon
                        points={ringPoints(measurePoints, projection.project)}
                        fill="rgba(255,204,68,0.12)"
                        stroke="#ffcc44"
                        strokeWidth="1.5"
                        strokeDasharray="4 3"
                      />
                    )}
                    <polyline
                      points={ringPoints(measurePoints, projection.project)}
                      fill="none"
                      stroke="#ffcc44"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                    {measurePoints.map(([lon, lat], i) => {
                      const [x, y] = projection.project(lon, lat);
                      return <circle key={i} cx={x} cy={y} r="3.4" fill="#ffcc44" stroke="#050e1c" strokeWidth="1" />;
                    })}
                  </g>
                )}
              </svg>
            ) : (
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                color: TEXT_4
              }}>
                {geoReady ? '当前视角暂无可用底图' : '底图加载中 …'}
              </div>
            )}
          </div>
        )}

        {tip && (
          <div style={{
            position: 'absolute',
            left: tip.fixed ? 16 : tip.x,
            top: tip.fixed ? 16 : tip.y,
            zIndex: 4,
            padding: '3px 8px',
            fontSize: 11,
            color: TEXT_1,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            background: 'rgba(5,14,28,0.86)',
            border: '1px solid rgba(73,195,255,0.35)',
            borderRadius: 8
          }}>
            {tip.text}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

