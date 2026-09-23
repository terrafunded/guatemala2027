"""Genera js/extra.js y data/extra.json desde data/MAESTRO_Partidos_GT_2027.xlsx.

Uso: python3 scripts/build_extra.py   (requiere openpyxl)
"""
import json
import os
import re

import openpyxl

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, 'data', 'MAESTRO_Partidos_GT_2027.xlsx')


def clean(v):
    if v is None:
        return None
    if hasattr(v, 'isoformat'):
        return v.isoformat()[:10]
    s = str(v).strip()
    return s or None


def rows(ws):
    it = ws.iter_rows(values_only=True)
    head = [clean(h) for h in next(it)]
    out = []
    for r in it:
        if not any(c not in (None, '') for c in r):
            continue
        out.append({h: clean(c) for h, c in zip(head, r) if h})
    return out


def urls(*vals):
    seen = []
    for v in vals:
        for u in re.split(r'[|;\s]+', v or ''):
            u = u.strip().rstrip(',')
            if u.startswith('http') and u not in seen:
                seen.append(u)
    return seen


def num(v):
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return None


def main():
    wb = openpyxl.load_workbook(XLSX, data_only=True)
    partidos = {}

    def P(sig):
        return partidos.setdefault(sig, {
            'equipo': [], 'candidatos': [], 'registro': [], 'tips': [], 'ficha': {}, 'fuentes': []})

    for r in rows(wb['encargados_campana']):
        nombre = r.get('nombre_completo')
        if not nombre or nombre.lower() == 'no identificado':
            continue
        P(r['partido_siglas'])['equipo'].append({
            'n': nombre, 'cargo': r.get('cargo_exacto'), 'tel': r.get('telefono'),
            'correo': r.get('correo'), 'linkedin': r.get('linkedin'), 'redes': r.get('redes'),
            'url': r.get('url_fuente'), 'fecha': r.get('fecha_fuente'), 'notas': r.get('notas')})

    for r in rows(wb['candidatos']):
        P(r['partido_siglas'])['candidatos'].append({
            'n': r.get('nombre'), 'cargo': r.get('cargo_aspira'), 'distrito': r.get('distrito_o_municipio'),
            'estatus': r.get('estatus_candidatura'), 'url': r.get('url_fuente'),
            'fecha': r.get('fecha_fuente'), 'notas': r.get('notas')})

    for r in rows(wb['enrichment_largo']):
        P(r['partido_siglas'])['registro'].append({
            'campo': r.get('campo'), 'valor': r.get('valor'), 'cargo': r.get('cargo_o_rol'),
            'url': r.get('url_fuente'), 'fecha': r.get('fecha_fuente'), 'notas': r.get('notas')})

    tips_general = []
    for r in rows(wb['tips_ventas']):
        tip = {'orden': r.get('orden'), 'prioridad': r.get('prioridad'), 'contacto': r.get('contacto'),
               'pitch': r.get('pitch'), 'nota': r.get('nota')}
        if r.get('partido_siglas') == 'GENERAL':
            tips_general.append(tip)
        else:
            P(r['partido_siglas'])['tips'].append(tip)

    resumen = {r['partido_siglas']: r for r in rows(wb['enrichment_resumen'])}
    for r in rows(wb['comercial_enrichment']):
        sig = r['partido_siglas']
        s = resumen.get(sig, {})
        P(sig)['ficha'] = {
            'correoAlt': r.get('correo_alterno'),
            'otros': r.get('otros_contactos_utiles'),
            'telTSE': r.get('telefono_sede_tse'),
            'correoTSE': r.get('correo_sede_tse'),
            'telAdicional': s.get('telefono_adicional'),
            'correoAdicional': s.get('correo_adicional'),
            'whatsapp': r.get('whatsapp_sede_o_inbox'),
            'whatsappNota': r.get('canal_whatsapp_o_fb_inbox_nota'),
            'agencia': r.get('agencia_o_proveedor_pauta_conocido'),
            'decisorComs': r.get('decisor_coms_si_hay'),
            'secOrganizacion': s.get('secretario_organizacion'),
            'secActas': s.get('secretario_actas'),
            'jefeCampana': s.get('jefe_campana_nacional'),
            'otrosRolesCEN': s.get('otros_roles_cen_utiles'),
            'nombreAsamblea': s.get('nombre_asamblea_si_cambio'),
            'notaNombre': s.get('nota_cambio_nombre'),
            'estadoAsamblea': r.get('timing_estado_asamblea_o_proclamacion'),
            'fechaEvento': r.get('timing_fecha_evento'),
            'eslogan': r.get('timing_eslogan_2027'),
            'logo': r.get('timing_logo_url'),
            'manualMarca': r.get('timing_manual_marca_url'),
            'maps': r.get('timing_google_maps_url'),
            'recepcion': r.get('timing_persona_recepcion_o_hablar_con'),
            'notasTiming': r.get('timing_notas'),
            'cumpleMinimo': r.get('musculo_cumple_minimo_28083'),
            'presencia': r.get('musculo_presencia_territorial_nota'),
            'evidenciaPromo': r.get('musculo_evidencia_promo_2023'),
            'detalleSancion': r.get('musculo_detalle_sancion'),
            'notasMusculo': r.get('musculo_notas'),
            'notasFinanzas': r.get('notas_07c') if r.get('notas_07c') != r.get('notas') else None,
        }
        P(sig)['fuentes'] = urls(r.get('url_fuentes'), r.get('url_fuente_finanzas'), r.get('url_fuente_agencia'),
                                 r.get('url_fuentes_07c'), r.get('timing_url_fuentes'),
                                 r.get('musculo_url_fuentes'), s.get('url_fuente_com'))

    formacion = [{
        'sig': r.get('partido_siglas'), 'nombre': r.get('partido_nombre'),
        'afiliados': num(r.get('afiliados_aprox')), 'decisor': r.get('decisor_probable_nombre'),
        'cargo': r.get('decisor_probable_cargo'), 'tel': r.get('telefono'), 'telAlt': r.get('telefono_alterno'),
        'correo': r.get('correo'), 'sede': r.get('sede_direccion'), 'canal': r.get('mejor_canal_primer_contacto'),
        'pitch': r.get('pitch_sugerido_1_linea'), 'url': r.get('url_fuentes'), 'notas': r.get('notas'),
    } for r in rows(wb['en_formacion'])]

    cancelados = [{
        'sig': r.get('siglas'), 'nombre': r.get('nombre_oficial'), 'sg': r.get('secretario_general'),
        'tel': r.get('telefono'), 'correo': r.get('correo'), 'sede': r.get('sede_central'),
        'url': r.get('url_fuente'),
    } for r in rows(wb['partidos']) if r.get('estatus_tse') == 'cancelado']

    fuentes = [{
        'fase': r.get('fase'), 'tipo': r.get('tipo'), 'url': r.get('url'),
        'fecha': r.get('fecha_documento_o_articulo'), 'nota': r.get('nota'),
    } for r in rows(wb['fuentes']) if r.get('url')]
    limitaciones = [r.get('nota') for r in rows(wb['fuentes']) if not r.get('url') and r.get('nota')]

    extra = {'partidos': partidos, 'formacion': formacion, 'cancelados': cancelados,
             'fuentes': fuentes, 'limitaciones': limitaciones, 'tipsGeneral': tips_general}
    body = json.dumps(extra, ensure_ascii=False, separators=(',', ':'))
    with open(os.path.join(ROOT, 'data', 'extra.json'), 'w', encoding='utf-8') as f:
        f.write(body + '\n')
    with open(os.path.join(ROOT, 'js', 'extra.js'), 'w', encoding='utf-8') as f:
        f.write('/* Data complementaria generada por scripts/build_extra.py desde\n'
                '   data/MAESTRO_Partidos_GT_2027.xlsx. No editar a mano. */\n')
        f.write('var EXTRA = ' + body + ';\n')
    print('partidos:', len(partidos), 'formacion:', len(formacion), 'cancelados:', len(cancelados),
          'fuentes:', len(fuentes), 'equipo:', sum(len(p['equipo']) for p in partidos.values()))


if __name__ == '__main__':
    main()
