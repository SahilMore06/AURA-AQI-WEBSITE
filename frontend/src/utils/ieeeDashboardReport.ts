export function generateDashboardIEEE(data: any, aqiValue: number, aqiLabel: string, advisory: string, locationName: string, lat?: number, lon?: number) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const aiAdvisoryHtml = advisory
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, ' ');

  const pollutants = [
    { key: 'pm2_5', label: 'PM₂.₅', unit: 'µg/m³', limit: 60 },
    { key: 'pm10', label: 'PM₁₀', unit: 'µg/m³', limit: 100 },
    { key: 'nitrogen_dioxide', label: 'NO₂', unit: 'µg/m³', limit: 80 },
    { key: 'ozone', label: 'O₃', unit: 'µg/m³', limit: 100 },
    { key: 'sulphur_dioxide', label: 'SO₂', unit: 'µg/m³', limit: 80 },
    { key: 'carbon_monoxide', label: 'CO', unit: 'µg/m³', limit: 4000 }
  ];

  const pollutantRows = pollutants
    .filter(p => data.current[p.key] !== undefined)
    .map((p, i) => {
      const val = parseFloat(data.current[p.key]) || 0;
      const status = val > p.limit ? 'Exceeds' : 'Within';
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9f9f9'}">
        <td style="padding:7px 10px;border:1px solid #ccc;font-weight:600">${p.label}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center">${val.toFixed(1)} ${p.unit}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center">${p.limit} ${p.unit}</td>
        <td style="padding:7px 10px;border:1px solid #ccc;text-align:center;color:${status==='Exceeds'?'#b00020':'#1a6b1a'};font-weight:600">${status}</td>
      </tr>`;
    }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Air Quality Alert Report — ${locationName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: "Times New Roman", Times, serif; font-size: 11pt; line-height: 1.6; color: #000; background: #fff; }
    .page { max-width: 720px; margin: 0 auto; padding: 48px; }
    .branding-strip { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 24px; }
    .brand-logo { height: 50px; width: 220px; }
    .brand-tag { text-align: right; font-size: 10pt; font-weight: bold; color: #000; line-height: 1.2; text-transform: uppercase; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 100pt; color: rgba(0,0,0,0.02); font-weight: 900; pointer-events: none; z-index: -1; text-transform: uppercase; white-space: nowrap; font-family: 'Arial Black', sans-serif; }
    .watermark-svg { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 70%; opacity: 0.02; pointer-events: none; z-index: -2; filter: grayscale(1); }

    .meta-row { font-size: 9.5pt; color: #333; margin-bottom: 2px; }
    .section { margin-bottom: 20px; }
    .section-heading { font-size: 11pt; font-weight: bold; font-variant: small-caps; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 10px; text-transform: uppercase; }
    .abstract-box { border: 1px solid #aaa; padding: 12px; margin-bottom: 24px; font-size: 10pt; background: #fff5f5; }
    .aqi-summary { display: flex; align-items: center; gap: 20px; border: 1.5px solid #000; padding: 12px; margin-bottom: 16px; background: #fffdfd; }
    .aqi-value { font-size: 36pt; font-weight: bold; line-height: 1; text-align: center; min-width: 70px; color: #b00020; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin: 12px 0; }
    th { padding: 7px; border: 1px solid #333; background: #1a1a1a; color: #fff; font-weight: bold; text-align: center; }
    td { font-size: 10pt; }
    .footer { margin-top: 36px; padding-top: 10px; border-top: 2px solid #000; font-size: 9pt; display: flex; justify-content: space-between; }
    @media print { body { background: none; } .page { padding: 0; } }
  </style>
</head>
<body>
  <div class="watermark-svg"><svg width="100%" height="100%" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg"><g transform="translate(5, 5)"><circle cx="20" cy="20" r="18" fill="none" stroke="#000" stroke-width="0.5" opacity="0.3"/><circle cx="20" cy="20" r="14" fill="none" stroke="#000" stroke-width="1" opacity="0.5"/><circle cx="20" cy="20" r="10" fill="none" stroke="#000" stroke-width="1.5" opacity="0.8"/><circle cx="20" cy="20" r="4" fill="#000"/><circle cx="35" cy="10" r="2.5" fill="#000"/><circle cx="5" cy="30" r="2.5" fill="#000"/></g><text x="55" y="32" font-family="Arial Black, sans-serif" font-weight="900" font-size="28" fill="#000">AURA</text><text x="55" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="#000" letter-spacing="0.8">AIR QUALITY REALTIME ANALYTICS</text></svg></div>
  <div class="watermark">AuraX</div>
  <div class="page">
    <div class="branding-strip">
      <div class="brand-logo"><svg width="220" height="50" viewBox="0 0 220 50" xmlns="http://www.w3.org/2000/svg"><g transform="translate(5, 5)"><circle cx="20" cy="20" r="18" fill="none" stroke="#00D4AA" stroke-width="0.5" opacity="0.3"/><circle cx="20" cy="20" r="14" fill="none" stroke="#00D4AA" stroke-width="1" opacity="0.5"/><circle cx="20" cy="20" r="10" fill="none" stroke="#00D4AA" stroke-width="1.5" opacity="0.8"/><circle cx="20" cy="20" r="4" fill="#00D4AA"/><circle cx="35" cy="10" r="2.5" fill="#00D4AA"/><circle cx="5" cy="30" r="2.5" fill="#60A5FA"/></g><text x="55" y="32" font-family="Arial Black, sans-serif" font-weight="900" font-size="28" fill="#111"><tspan fill="#00D4AA">A</tspan>URA</text><text x="55" y="44" font-family="Arial, sans-serif" font-weight="700" font-size="7" fill="#666" letter-spacing="0.8">AIR QUALITY REALTIME ANALYTICS</text></svg></div>
      <div class="brand-tag">Environmental Intelligence Agency<br>Official Assessment Report</div>
    </div>

    <div class="title-block">
      <h1 class="paper-title">HAZARDOUS AIR QUALITY ALERT REPORT</h1>
      <div class="meta-row"><strong>LOCATION:</strong> ${locationName}</div>
      <div class="meta-row"><strong>TIMESTAMP:</strong> ${dateStr} ${timeStr}</div>
    </div>
    
    <div class="abstract-box">
      <strong>ABSTRACT:</strong> This document serves as an automated environmental compliance and health risk alert triggered by the Aura Air Quality Dashboard. Real-time telemetry recorded an AQI of ${aqiValue}, placing the measured locale in the "${aqiLabel}" classification. Immediate public health precautions or automated control interventions are strongly advised.
    </div>

    <div class="section">
      <h2 class="section-heading"><span class="section-number">I.</span> Primary Metric Overview</h2>
      <div class="aqi-summary">
        <div class="aqi-value">${aqiValue}</div>
        <div>
          <div style="font-size:13pt;font-weight:bold;color:#b00020">${aqiLabel} Hazard Level</div>
          <div style="font-size:10pt">EPA Standard Air Quality Index (US AQI).</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-heading"><span class="section-number">II.</span> Localized Pollutant Telemetry</h2>
      <div style="font-size:10pt;text-align:center;font-weight:bold;font-variant:small-caps;margin-bottom:5px;">Table I: Real-Time Pollutant Data vs INAAQS Thresholds</div>
      <table>
        <thead>
          <tr>
            <th>Pollutant</th>
            <th>Measured Value</th>
            <th>INAAQS Limit</th>
            <th>Compliance Status</th>
          </tr>
        </thead>
        <tbody>
          ${pollutantRows}
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-heading"><span class="section-number">III.</span> Automated AI Health Advisory</h2>
      <div style="font-size:10.5pt;line-height:1.7;">
        <p>${aiAdvisoryHtml}</p>
      </div>
    </div>

    ${lat !== undefined && lon !== undefined ? `
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <div class="section">
      <h2 class="section-heading"><span class="section-number">IV.</span> Terrain &amp; Geographic Context</h2>
      <div style="font-size:9.5pt;color:#444;margin-bottom:8px;">
        Coordinates: <strong>${lat.toFixed(4)}&deg;&thinsp;N, ${lon.toFixed(4)}&deg;&thinsp;E</strong> &nbsp;|&nbsp; Location: <strong>${locationName}</strong>
      </div>
      <div style="border:1.5px solid #aaa;padding:4px;margin:10px 0;background:#e8e8e8;text-align:center;overflow:hidden;">
        <div style="font-size:9pt;color:#666;font-style:italic;margin-bottom:6px;">Fig. 1 &mdash; Terrain &amp; Settlement Map &middot; ${locationName} &middot; &copy; OpenStreetMap</div>
        <div id="reportMap" style="width:100%;height:280px;border:1px solid #ccc;display:block;background:#e0e0e0;"></div>
      </div>
      <div style="font-size:8.5pt;color:#555;line-height:1.5;">
        The above map depicts the monitored geographic region centred on <strong>${locationName}</strong>. 
        Topographic features including elevation, proximity to industrial zones, water bodies, and urban density 
        are key factors in localised air quality dispersion and pollutant accumulation. 
        &copy; OpenStreetMap contributors, ODbL licence.
      </div>
    </div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      (function() {
        var map = L.map('reportMap', {
          center: [${lat}, ${lon}],
          zoom: 11,
          zoomControl: false,
          scrollWheelZoom: false,
          attributionControl: true
        });
        var tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
        }).addTo(map);

        var icon = L.divIcon({
          className: '',
          html: '<div style="width:16px;height:16px;border-radius:50%;background:#b00020;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.45);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([${lat}, ${lon}], { icon: icon }).addTo(map);

        // Ensure tiles are loaded before printing
        tiles.on('load', function() {
           window.mapReady = true;
        });
      })();
    </script>` : ''}

    <div class="section" style="margin-top:40px;">
      <h2 class="section-heading"><span class="section-number">V.</span> Certification &amp; Signatories</h2>
      <p style="font-size:9.5pt;margin-bottom:20px;">
        This document has been electronically generated by the AuraX Environmental Intelligence Platform. 
        The measurements and advisories contained herein are based on real-time sensor telemetry and predictive modeling.
      </p>
      <div style="display:flex;justify-content:space-between;margin-top:20px;">
        <div style="width:30%;border-top:1px solid #000;text-align:center;padding-top:5px;">
          <div style="font-size:9pt;font-weight:bold;">Automated System</div>
          <div style="font-size:8pt;color:#666;">Data Acquisition Unit</div>
        </div>
        <div style="width:30%;border-top:1px solid #000;text-align:center;padding-top:5px;">
          <div style="font-size:9pt;font-weight:bold;">Verified By AI Engine</div>
          <div style="font-size:8pt;color:#666;">Environmental Compliance</div>
        </div>
        <div style="width:30%;border-top:1px solid #000;text-align:center;padding-top:5px;position:relative;">
          <div style="font-size:9pt;font-weight:bold;">Authorized Signatory</div>
          <div style="font-size:8pt;color:#666;">AuraX Environmental Agency</div>
          <div style="position:absolute;top:-40px;left:50%;transform:translateX(-50%);font-family:'Courier New',Courier,monospace;color:rgba(176,0,32,0.4);border:2px solid rgba(176,0,32,0.3);padding:2px 8px;border-radius:4px;font-size:10pt;font-weight:bold;transform:rotate(-10deg);">VERIFIED AT SOURCE</div>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <div>Report ID: AQR-${now.getTime().toString(36).toUpperCase()} | ${now.toISOString().slice(0, 19).replace('T', ' ')} UTC</div>
      <div>&copy; AuraX Intelligence Platform &mdash; Environmental Compliance Division</div>
    </div>
  </div>
  <script>
    window.onload = () => { 
      // Wait for map tiles or a reasonable fixed delay if tiles fail
      let checkMap = setInterval(() => {
        if (window.mapReady || !document.getElementById('reportMap')) {
          clearInterval(checkMap);
          setTimeout(() => window.print(), 1500); // Small final buffer for rendering
        }
      }, 500);
      
      // Safety timeout after 5 seconds to print anyway
      setTimeout(() => { 
        if (checkMap) {
          clearInterval(checkMap);
          window.print();
        }
      }, 5000);
    };
  </script>
</body>
</html>`;
}
