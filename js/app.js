/* War Room Partidos GT 2027 · lógica de la app (vanilla JS, sin dependencias)
   La data vive en js/data.js (DATA) y js/extra.js (EXTRA, resto del Excel maestro). */

(function () {
  'use strict';

  // ---------- constantes ----------
  var SCORECOL = { A: '#46D493', B: '#F2B63D', C: '#97A2B4' };
  var RISKCOL = { bajo: '#46D493', medio: '#F2B63D', alto: '#FF6B6B', desconocido: '#97A2B4' };
  var CONFCOL = { alto: '#46D493', medio: '#F2B63D', bajo: '#97A2B4' };

  var MAXA = Math.max.apply(null, DATA.map(function (p) { return p.afiliados || 0; }));
  var MAXD = Math.max.apply(null, DATA.map(function (p) { return p.dip || 0; }));
  var MAXL = Math.max.apply(null, DATA.map(function (p) { return p.alc || 0; }));
  var EX = (typeof EXTRA !== 'undefined') ? EXTRA
    : { partidos: {}, formacion: [], cancelados: [], fuentes: [], limitaciones: [], tipsGeneral: [] };
  var TOTA = DATA.reduce(function (a, p) { return a + (p.afiliados || 0); }, 0);

  // ---------- estado ----------
  var state = { q: '', score: 'todos', pres: false, priv: false, sort: 'orden', selSig: null };

  // ---------- helpers ----------
  function $(sel) { return document.querySelector(sel); }
  function fmt(n) { return (n === null || n === undefined) ? 's/d' : n.toLocaleString('es-GT'); }
  function sd(v) { return (v === null || v === undefined || v === '') ? 's/d' : v; }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ex(sig) {
    return EX.partidos[sig] || { equipo: [], candidatos: [], registro: [], tips: [], ficha: {}, fuentes: [] };
  }
  function mTel(v) { return v ? (state.priv ? '•••• ••••' : v) : ''; }
  function mMail(v) { return v ? (state.priv ? '•••••@•••••' : v) : ''; }
  function isUrl(u) { return typeof u === 'string' && /^https?:\/\//.test(u); }
  function srcLink(u, label) {
    return isUrl(u) ? ' <a class="srclink" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(label || 'fuente') + ' ↗</a>' : '';
  }
  function kv(k, v) {
    return v ? '<div class="dkv"><span class="k">' + esc(k) + ': </span>' + esc(v) + '</div>' : '';
  }
  function kvLink(k, u) {
    return isUrl(u) ? '<div class="dkv"><span class="k">' + esc(k) + ': </span>' + srcLink(u, 'abrir') + '</div>' : '';
  }
  function secret(campo) { return /tel|correo|whatsapp|mail/i.test(campo || ''); }
  function searchText(p) {
    var e = ex(p.sig);
    return (p.sig + ' ' + p.nombre + ' ' + (p.pres || '') + ' ' + (p.decisor || '') + ' ' +
      e.equipo.map(function (x) { return x.n; }).join(' ') + ' ' +
      e.candidatos.map(function (x) { return x.n; }).join(' ')).toLowerCase();
  }

  function byId(sig) {
    for (var i = 0; i < DATA.length; i++) { if (DATA[i].sig === sig) { return DATA[i]; } }
    return null;
  }

  // ---------- filtro + orden ----------
  function visibleRows() {
    var q = state.q.toLowerCase();
    var rows = DATA.filter(function (p) {
      if (state.score !== 'todos' && p.score !== state.score) { return false; }
      if (state.pres && !p.presAnunciado) { return false; }
      if (q) {
        if (searchText(p).indexOf(q) === -1) { return false; }
      }
      return true;
    }).slice();
    if (state.sort === 'afiliados') { rows.sort(function (a, b) { return (b.afiliados || 0) - (a.afiliados || 0); }); }
    else if (state.sort === 'rank') { rows.sort(function (a, b) { return (a.rank || 99) - (b.rank || 99); }); }
    else if (state.sort === 'az') { rows.sort(function (a, b) { return a.sig.localeCompare(b.sig); }); }
    else { rows.sort(function (a, b) { return (a.orden || 99) - (b.orden || 99); }); }
    return rows;
  }

  // ---------- KPIs con conteo animado ----------
  function renderKPIs() {
    var NP = DATA.filter(function (p) { return p.presAnunciado; }).length;
    var NA = DATA.filter(function (p) { return p.score === 'A'; }).length;
    var defs = [
      { label: 'Partidos vigentes', end: DATA.length, sub: 'inscritos ante el TSE', f: String },
      { label: 'Con presidenciable', end: NP, sub: 'anunciado o precandidato', f: function (n) { return n + ' / ' + DATA.length; } },
      { label: 'Afiliados totales', end: TOTA, sub: 'padrón partidario agregado', f: fmt },
      { label: 'Cuentas score A', end: NA, sub: 'prioridad máxima de llamada', f: String }
    ];
    $('#kpis').innerHTML = defs.map(function (d, i) {
      return '<div class="kpi"><div class="kpi-label">' + esc(d.label) + '</div>' +
        '<div class="kpi-value" id="kpiv' + i + '">0</div>' +
        '<div class="kpi-sub">' + esc(d.sub) + '</div></div>';
    }).join('');
    var t0 = null;
    function tick(ts) {
      if (t0 === null) { t0 = ts; }
      var p = Math.min(1, (ts - t0) / 1100);
      var e = 1 - Math.pow(1 - p, 3);
      defs.forEach(function (d, i) {
        document.getElementById('kpiv' + i).textContent = d.f(Math.round(d.end * e));
      });
      if (p < 1) { requestAnimationFrame(tick); }
    }
    requestAnimationFrame(tick);
  }

  // ---------- franja de padrón ----------
  function renderStrip() {
    $('#stripTotal').textContent = fmt(TOTA) + ' afiliados';
    var sorted = DATA.slice().sort(function (a, b) { return (b.afiliados || 0) - (a.afiliados || 0); });
    $('#strip').innerHTML = sorted.map(function (p) {
      var w = Math.max(0.5, 100 * (p.afiliados || 0) / TOTA);
      return '<button class="seg" style="flex-grow:' + w.toFixed(2) + ';background:' + p.accent + '"' +
        ' data-sig="' + esc(p.sig) + '"' +
        ' aria-label="Abrir dossier de ' + esc(p.sig) + '"' +
        ' title="' + esc(p.sig + ' · ' + fmt(p.afiliados) + ' afiliados') + '"></button>';
    }).join('');
  }

  // ---------- tarjetas ----------
  function cardHTML(p, i) {
    var sc = SCORECOL[p.score] || '#97A2B4';
    var rc = RISKCOL[p.riesgo] || '#97A2B4';
    var pct = Math.round(100 * (p.afiliados || 0) / MAXA);
    var parts = [];
    if (p.dip !== null) { parts.push(p.dip + ' dip'); }
    if (p.alc !== null) { parts.push(p.alc + ' alc'); }
    if (p.deptos !== null) { parts.push(p.deptos + ' deptos'); }
    return '<button class="card" style="--pc:' + p.accent + ';animation-delay:' + Math.min(i * 45, 700) + 'ms" data-sig="' + esc(p.sig) + '">' +
      '<div class="card-head"><span class="ordertag">#' + (p.orden || '·') + ' LLAMADA</span>' +
      '<span class="badge" style="background:' + sc + '">SCORE ' + esc(p.score) + '</span></div>' +
      '<div><div class="sig">' + esc(p.sig) + '</div><div class="pname">' + esc(p.nombre) + '</div></div>' +
      '<div><div class="microlabel">Presidenciable</div>' +
      (p.pres
        ? '<div class="pres">' + esc(p.pres) + '</div>'
        : '<div class="pres sin">Sin anuncio público</div>') +
      '</div>' +
      '<div><div class="afilrow"><span class="microlabel">Afiliados</span>' +
      '<span class="afiln">' + fmt(p.afiliados) + '</span></div>' +
      '<div class="track"><div class="fill" data-w="' + pct + '" style="background:' + p.accent + ';transition-delay:' + Math.min(i * 40, 600) + 'ms"></div></div></div>' +
      '<div class="cfoot"><span class="chips">' + esc(parts.length ? parts.join(' · ') : 'sin cargos 2023') + '</span>' +
      '<span class="risk"><span class="dot" style="background:' + rc + '"></span>riesgo ' + esc(p.riesgo || 's/d') + '</span></div>' +
      '<div class="cta">Abrir dossier ↗</div>' +
      '</button>';
  }

  function renderGrid() {
    var rows = visibleRows();
    $('#grid').innerHTML = rows.map(cardHTML).join('');
    $('#empty').hidden = rows.length > 0;
    $('#count').textContent = rows.length + ' DE ' + DATA.length + ' PARTIDOS';
    animateFills($('#grid'));
  }

  function animateFills(scope) {
    var fills = scope.querySelectorAll('.fill[data-w]');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        fills.forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
      });
    });
  }

  // ---------- dossier ----------
  function drawerHTML(p) {
    var rc = RISKCOL[p.riesgo] || '#97A2B4';
    var conf = p.confianza || 's/d';
    var cc = CONFCOL[conf] || '#97A2B4';
    var tel = state.priv ? '•••• ••••' : sd(p.tel);
    var telAlt = state.priv ? '' : (p.telAlt ? 'alt: ' + p.telAlt : '');
    var correo = state.priv ? '•••••@•••••' : sd(p.correo);
    var bars = [
      { l: 'Diputados 2023', v: p.dip, max: MAXD },
      { l: 'Alcaldes 2023', v: p.alc, max: MAXL },
      { l: 'Deptos con organización', v: p.deptos, max: 22 }
    ];
    var redes = [p.web, p.fb, p.ig, p.x, p.tiktok].filter(Boolean);
    var e = ex(p.sig);
    var f = e.ficha || {};
    return '' +
      '<div class="dhead" style="--pc:' + p.accent + '">' +
      '<div class="dhead-top"><span class="dhead-tag">LLAMADA #' + (p.orden || '·') + ' · SCORE ' + esc(p.score) + '</span>' +
      '<button class="xbtn" id="closeBtn" aria-label="Cerrar dossier">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"></path></svg>' +
      '</button></div>' +
      '<div class="dhead-body"><div class="dsig">' + esc(p.sig) + '</div>' +
      '<div class="dname">' + esc(p.nombre) + '</div>' +
      '<div class="dcolor">' + esc(p.color ? 'Color oficial ' + p.color + ' · ' + (p.colorLabel || '') : 'Color oficial sin verificar') + '</div></div>' +
      '</div>' +

      '<div class="dsec"><p class="dlabel">Presidenciable</p>' +
      '<div class="dbig">' + esc(p.pres || 'Sin anuncio público') + '</div>' +
      '<div class="dtext">' + esc(sd(p.evento)) + '</div>' +
      '<div class="dmono">' + esc(p.arranque ? 'Arranque estimado de campaña: ' + p.arranque : 'Arranque de campaña sin estimar') + '</div></div>' +

      '<div class="dsec"><p class="dlabel">Puerta de entrada</p>' +
      '<div class="dperson"><span class="dperson-n">' + esc(sd(p.decisor)) + '</span>' +
      '<span class="pill" style="background:' + cc + '">confianza ' + esc(conf) + '</span></div>' +
      '<div class="dtext" style="margin-top:4px">' + esc(sd(p.decisorCargo)) + '</div>' +
      '<div class="dtext">' + esc(sd(p.porQue)) + '</div>' +
      '<div class="dmono" style="margin-top:12px;font-size:11.5px">Finanzas: ' + esc(sd(p.finanzas)) + '</div>' +
      '<div class="dmono" style="margin-top:4px;font-size:11.5px">Secretaría general: ' + esc(sd(p.sg)) + '</div></div>' +

      '<div class="dsec"><p class="dlabel">Contacto directo</p>' +
      '<div class="dgrid2">' +
      '<div class="dbox"><div class="dbox-l">Teléfono</div><div class="dbox-v">' + esc(tel) + '</div><div class="dbox-alt">' + esc(telAlt) + '</div></div>' +
      '<div class="dbox"><div class="dbox-l">Correo</div><div class="dbox-v sm">' + esc(correo) + '</div></div>' +
      '</div>' +
      '<div class="dkv"><span class="k">Mejor canal: </span>' + esc(sd(p.canal)) + '</div>' +
      '<div class="dkv" style="margin-top:8px"><span class="k">Sede: </span>' + esc((p.sede || 's/d') + (p.zona ? ' · ' + p.zona : '')) + '</div>' +
      (p.horario ? '<div class="dmono" style="margin-top:6px">Horario: ' + esc(p.horario) + '</div>' : '') +
      kv('Correo alterno', mMail(f.correoAlt)) +
      kv('Teléfonos TSE', mTel(f.telTSE)) +
      kv('Correos TSE', mMail(f.correoTSE)) +
      kv('Teléfono adicional', mTel(f.telAdicional)) +
      kv('Correo adicional', mMail(f.correoAdicional)) +
      kv('WhatsApp / inbox', mTel(f.whatsapp)) +
      kv('Nota WhatsApp', f.whatsappNota) +
      kv('En sede hablar con', f.recepcion) +
      kvLink('Mapa de la sede', f.maps) +
      '</div>' +

      equipoHTML(e) +
      otrosHTML(f) +
      candidatosHTML(e) +

      '<div class="dsec pitch"><p class="dlabel verde">Pitch sugerido</p>' +
      '<div class="dpitch">' + esc(sd(p.pitch)) + '</div>' +
      (p.scoreRazon ? '<div class="drazon">Razón del score: ' + esc(p.scoreRazon) + '</div>' : '') +
      e.tips.map(function (t) {
        return '<div class="dtip"><div class="dtip-h">Tip de venta' + (t.prioridad ? ' · prioridad ' + esc(t.prioridad) : '') + '</div>' +
          (t.contacto ? '<div class="dtext">Contacto: ' + esc(state.priv ? 'oculto' : t.contacto) + '</div>' : '') +
          (t.pitch ? '<div class="dtext">' + esc(t.pitch) + '</div>' : '') +
          (t.nota ? '<div class="dmono">' + esc(t.nota) + '</div>' : '') + '</div>';
      }).join('') +
      '</div>' +

      marcaHTML(f) +

      '<div class="dsec"><p class="dlabel">Músculo territorial</p>' +
      '<div class="dmrow"><span class="dmono" style="margin-top:0;font-size:12px">' + fmt(p.afiliados) + ' afiliados</span>' +
      '<span class="dmono" style="margin-top:0">' + esc(p.rank ? '#' + p.rank + ' del ranking de padrón' : '') + '</span></div>' +
      '<div class="dbars">' +
      bars.map(function (b) {
        var pct = b.v === null ? 0 : Math.round(100 * b.v / b.max);
        return '<div class="dbar"><div class="dbar-h"><span class="dbar-l">' + esc(b.l) + '</span>' +
          '<span class="dbar-v">' + esc(b.v === null ? 's/d' : String(b.v)) + '</span></div>' +
          '<div class="track"><div class="fill" data-w="' + pct + '" style="background:' + p.accent + '"></div></div></div>';
      }).join('') +
      '</div>' +
      '<div class="dtext" style="margin-top:16px">' + esc(p.promo2023 ? 'Historial de compra de material 2023: ' + p.promo2023 : 'Historial de material 2023 sin evidencia') + '</div>' +
      '<div class="driskrow"><span class="dot" style="background:' + rc + '"></span>Riesgo de cobro: ' + esc(p.riesgo || 's/d') + '</div>' +
      '<div class="dsancion">' + esc(p.sancion === 'desconocido' ? 'Sanciones TSE: sin dato verificado' : (p.sancion ? 'Sanciones TSE: ' + p.sancion : '')) + '</div>' +
      kv('Cumple mínimo 28,083 afiliados', f.cumpleMinimo) +
      kv('Presencia territorial', f.presencia) +
      kv('Evidencia de promo 2023', f.evidenciaPromo) +
      kv('Detalle de sanción', f.detalleSancion) +
      kv('Notas de músculo', f.notasMusculo) +
      '</div>' +

      '<div class="dsec"><p class="dlabel">Redes y sitio</p>' +
      (redes.length
        ? '<div class="dlinks">' + redes.map(function (u) {
            return '<a class="ulink" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a>';
          }).join('') + '</div>'
        : '<div class="dmono" style="margin-top:0;font-size:11.5px">Sin redes verificadas en fuentes consultadas.</div>') +
      '</div>' +

      '<div class="dsec"><p class="dlabel">Notas de campo</p>' +
      '<div class="dtext" style="margin-top:0">' + esc(sd(p.notas)) + '</div>' +
      kv('Notas de finanzas', f.notasFinanzas) + '</div>' +

      fuentesHTML(e) +
      registroHTML(e);
  }

  function equipoHTML(e) {
    if (!e.equipo.length) { return ''; }
    return '<div class="dsec"><p class="dlabel">Equipo, CEN y encargados (' + e.equipo.length + ')</p>' +
      '<div class="plist">' + e.equipo.map(function (x) {
        var contacto = [mTel(x.tel), mMail(x.correo)].filter(Boolean).join(' · ');
        return '<div class="pitem"><div class="pitem-n">' + esc(x.n) + '</div>' +
          '<div class="pitem-c">' + esc(sd(x.cargo)) + (x.fecha ? ' · ' + esc(x.fecha) : '') + srcLink(x.url) + '</div>' +
          (contacto ? '<div class="pitem-m">' + esc(contacto) + '</div>' : '') +
          (isUrl(x.linkedin) ? '<div class="pitem-m">' + srcLink(x.linkedin, 'LinkedIn') + '</div>' : '') +
          (x.redes ? '<div class="pitem-m">' + esc(x.redes) + '</div>' : '') +
          (x.notas ? '<div class="pitem-t">' + esc(x.notas) + '</div>' : '') +
          '</div>';
      }).join('') + '</div></div>';
  }

  function otrosHTML(f) {
    var body = kv('Decisor de comunicación', f.decisorComs) +
      kv('Jefe de campaña nacional', f.jefeCampana) +
      kv('Secretaría de organización', f.secOrganizacion) +
      kv('Secretaría de actas', f.secActas) +
      kv('Otros roles CEN', f.otrosRolesCEN) +
      kv('Otros contactos útiles', f.otros) +
      kv('Agencia / proveedor de pauta', f.agencia);
    return body ? '<div class="dsec"><p class="dlabel">Otros contactos útiles</p>' + body + '</div>' : '';
  }

  function candidatosHTML(e) {
    if (!e.candidatos.length) { return ''; }
    return '<div class="dsec"><p class="dlabel">Candidatos y precandidatos (' + e.candidatos.length + ')</p>' +
      '<div class="plist">' + e.candidatos.map(function (c) {
        return '<div class="pitem"><div class="pitem-n">' + esc(c.n) + '</div>' +
          '<div class="pitem-c">' + esc([c.cargo, c.distrito, c.estatus].filter(Boolean).join(' · ')) +
          (c.fecha ? ' · ' + esc(c.fecha) : '') + srcLink(c.url) + '</div>' +
          (c.notas ? '<div class="pitem-t">' + esc(c.notas) + '</div>' : '') + '</div>';
      }).join('') + '</div></div>';
  }

  function marcaHTML(f) {
    var body = kv('Nombre aprobado en asamblea', f.nombreAsamblea) +
      kv('Cambio de nombre', f.notaNombre) +
      kv('Estado de asamblea / proclamación', f.estadoAsamblea ? f.estadoAsamblea.replace(/_/g, ' ') : null) +
      kv('Fecha del evento', f.fechaEvento) +
      kv('Eslogan 2027', f.eslogan) +
      kvLink('Logo', f.logo) +
      kvLink('Manual de marca', f.manualMarca) +
      kv('Notas de timing', f.notasTiming);
    return body ? '<div class="dsec"><p class="dlabel">Marca y timing</p>' + body + '</div>' : '';
  }

  function fuentesHTML(e) {
    if (!e.fuentes.length) { return ''; }
    return '<div class="dsec"><p class="dlabel">Fuentes (' + e.fuentes.length + ')</p><div class="dlinks">' +
      e.fuentes.map(function (u) {
        return '<a class="ulink" href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u) + '</a>';
      }).join('') + '</div></div>';
  }

  function registroHTML(e) {
    if (!e.registro.length) { return '<div class="dsec last"></div>'; }
    return '<div class="dsec last"><details class="dreg"><summary class="dlabel">Registro detallado del enriquecimiento (' + e.registro.length + ')</summary>' +
      e.registro.map(function (r) {
        var v = secret(r.campo) && state.priv ? 'oculto' : r.valor;
        return '<div class="regrow"><div class="regk">' + esc((r.campo || '').replace(/_/g, ' ')) + '</div>' +
          '<div class="regv">' + esc(sd(v)) + (r.cargo ? ' <span class="regc">(' + esc(r.cargo) + ')</span>' : '') +
          (r.fecha ? ' <span class="regc">' + esc(r.fecha) + '</span>' : '') + srcLink(r.url) + '</div>' +
          (r.notas ? '<div class="pitem-t">' + esc(r.notas) + '</div>' : '') + '</div>';
      }).join('') + '</details></div>';
  }

  // ---------- secciones del resto del Excel ----------
  function renderExtras() {
    var q = state.q.toLowerCase();
    var form = EX.formacion.filter(function (x) {
      return !q || (x.sig + ' ' + x.nombre + ' ' + (x.decisor || '')).toLowerCase().indexOf(q) !== -1;
    });
    $('#formCount').textContent = form.length + ' DE ' + EX.formacion.length;
    $('#formGrid').innerHTML = form.map(function (x) {
      var tels = [mTel(x.tel), mTel(x.telAlt)].filter(Boolean).join(' / ');
      return '<div class="xcard"><div class="xcard-h"><span class="xsig">' + esc(x.sig) + '</span>' +
        '<span class="xafil">' + fmt(x.afiliados) + ' afiliados</span></div>' +
        '<div class="pname">' + esc(x.nombre) + '</div>' +
        '<div class="pitem-n" style="margin-top:10px">' + esc(sd(x.decisor)) + '</div>' +
        '<div class="pitem-c">' + esc(sd(x.cargo)) + srcLink(x.url) + '</div>' +
        (tels ? '<div class="pitem-m">' + esc(tels) + '</div>' : '') +
        (x.correo ? '<div class="pitem-m">' + esc(mMail(x.correo)) + '</div>' : '') +
        kv('Sede', x.sede) + kv('Mejor canal', x.canal) +
        (x.notas ? '<div class="pitem-t">' + esc(x.notas) + '</div>' : '') + '</div>';
    }).join('');

    $('#cancGrid').innerHTML = EX.cancelados.map(function (x) {
      var extra = [x.sg, mTel(x.tel), mMail(x.correo), x.sede].filter(Boolean).join(' · ');
      return '<div class="crow"><span class="xsig">' + esc(x.sig) + '</span>' +
        '<span class="crow-n">' + esc(x.nombre) + (extra ? ' · ' + esc(extra) : '') + '</span></div>';
    }).join('');

    $('#tipsGeneral').innerHTML = EX.tipsGeneral.map(function (t) {
      return '<div class="dtext">' + esc(t.pitch) + '</div>' + (t.nota ? '<div class="dmono">' + esc(t.nota) + '</div>' : '');
    }).join('');

    $('#limitaciones').innerHTML = EX.limitaciones.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('');
    $('#fuentesCount').textContent = EX.fuentes.length;
    $('#fuentesList').innerHTML = EX.fuentes.map(function (x) {
      return '<div class="regrow"><div class="regk">' + esc([x.fase, x.tipo, x.fecha].filter(Boolean).join(' · ')) + '</div>' +
        '<div class="regv">' + srcLink(x.url, x.url) + '</div>' +
        (x.nota ? '<div class="pitem-t">' + esc(x.nota) + '</div>' : '') + '</div>';
    }).join('');
  }

  function openDrawer(sig) {
    var p = byId(sig);
    if (!p) { return; }
    state.selSig = sig;
    var drawer = $('#drawer');
    drawer.innerHTML = drawerHTML(p);
    drawer.scrollTop = 0;
    drawer.classList.add('open');
    $('#scrim').classList.add('open');
    document.getElementById('closeBtn').addEventListener('click', closeDrawer);
    animateFills(drawer);
    document.getElementById('closeBtn').focus();
  }

  function closeDrawer() {
    state.selSig = null;
    $('#drawer').classList.remove('open');
    $('#scrim').classList.remove('open');
  }

  // ---------- eventos ----------
  function bind() {
    $('#buscador').addEventListener('input', function (e) {
      state.q = e.target.value;
      renderGrid();
      renderExtras();
    });
    $('#scoreChips').addEventListener('click', function (e) {
      var btn = e.target.closest('.chipbtn');
      if (!btn) { return; }
      state.score = btn.getAttribute('data-score');
      document.querySelectorAll('#scoreChips .chipbtn').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      renderGrid();
    });
    $('#presToggle').addEventListener('click', function () {
      state.pres = !state.pres;
      this.setAttribute('aria-pressed', String(state.pres));
      renderGrid();
    });
    $('#privToggle').addEventListener('click', function () {
      state.priv = !state.priv;
      this.setAttribute('aria-pressed', String(state.priv));
      if (state.selSig) { openDrawer(state.selSig); }
      renderExtras();
    });
    $('#orden').addEventListener('change', function (e) {
      state.sort = e.target.value;
      renderGrid();
    });
    document.body.addEventListener('click', function (e) {
      var opener = e.target.closest('[data-sig]');
      if (opener) { openDrawer(opener.getAttribute('data-sig')); }
    });
    $('#scrim').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && state.selSig) { closeDrawer(); }
    });
  }

  // ---------- init ----------
  renderKPIs();
  renderStrip();
  renderGrid();
  renderExtras();
  bind();
})();
