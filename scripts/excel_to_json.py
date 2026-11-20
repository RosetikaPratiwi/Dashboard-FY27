"""Converts the Excel workbook (sheets Data, Data Lengkap, PetaKota) to data/data.json.
Usage: python scripts/excel_to_json.py "path\\to\\Dashboard_Kontrak_FY27.xlsm" data/data.json   (needs: pip install openpyxl)"""
import sys, json, datetime as dt
from openpyxl import load_workbook

src, out = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'data/data.json')
wb = load_workbook(src, read_only=True, data_only=True)

def table(name):
    it = wb[name].iter_rows(values_only=True)
    head = [str(h).strip() if h is not None else '' for h in next(it)]
    for r in it:
        yield dict(zip(head, r))

def num(v):
    try: return float(v)
    except (TypeError, ValueError): return 0.0

quotations = []
for r in table('Data'):
    if not r.get('PIC') and not r.get('Status'): continue
    quotations.append({'period': str(r['Periode'] or 'P1'), 'oppty': str(r['Oppty No'] or ''), 'pic': str(r['PIC'] or '').strip().upper(), 'modality': r['Modalitas'],
        'bu': r['BU'], 'eqNo': r['Eq Nomor'], 'serial': r['Serial Nomor'], 'shipTo': r['Ship to Party'], 'customer': r['End Customer'], 'status': r['Status'],
        'progress': num(r['Progress (%)']), 'sla': r['SLA'], 'valueYear': num(r['Nilai / Tahun']), 'margin': r['Margin'], 'city': r['Kota'],
        'contractPeriod': r['Periode Kontrak'], 'totalValue': num(r['Nilai Total']), 'vertical': r['Vertikal Hospital']})

def iso(v):
    if isinstance(v, (dt.datetime, dt.date)): return v.strftime('%Y-%m-%d')
    return str(v)[:10] if v else None

contracts = []
for r in table('Data Lengkap'):
    end = iso(r.get('Validity Date End Kontrak'))
    if str(r.get('SYS_EQ_STATUS', '')).lower() != 'active' or not end or end < dt.date.today().isoformat(): continue  # active, not expired
    contracts.append({'bu': r['MAT_DIVISION_TEXT'], 'equipment': r['MAT_IVK_NAME'], 'serial': r['SYS_EQ_SERIAL_ID'], 'eqNo': r['SYS_EQ_ID_RU'],
        'customer': r['CUST_NAME_1'], 'city': r['FL_ADDR_CITY1'], 'type': r.get('Tipe Kontrak'), 'end': end, 'pic': str(r.get('PIC') or '').strip().upper()})

# PetaKota: A=alias, B=Kota Peta, D=Kota Peta, E=Lat, F=Lon (data from row 3)
alias, coords = {}, {}
for row in wb['PetaKota'].iter_rows(min_row=3, max_col=6, values_only=True):
    if row[0] and row[1]: alias[str(row[0]).strip()] = str(row[1]).strip()
    if row[3] and row[4] is not None: coords[str(row[3]).strip()] = [num(row[4]), num(row[5])]
cities = {a: coords[k] + [k] for a, k in alias.items() if k in coords}   # [lat, lon, map city name]
cities.update({k: v + [k] for k, v in coords.items()})

def col(sheet, c, r1, r2):
    return [row[0] for row in wb[sheet].iter_rows(min_row=r1, max_row=r2, min_col=c, max_col=c, values_only=True)]
# Kalkulasi O6:O17 = Target Booked P1-P12, P6:P17 = Target Committed P1-P12; Pengaturan C11/C12 = Kritis/Warning days
targets = {'booked': [num(v) for v in col('Kalkulasi', 15, 6, 17)], 'committed': [num(v) for v in col('Kalkulasi', 16, 6, 17)]}
kr, wr = col('Pengaturan', 3, 11, 12)

json.dump({'updated': dt.datetime.now().strftime('%Y-%m-%d %H:%M'), 'targets': targets, 'thresholds': {'kritis': int(num(kr) or 30), 'warning': int(num(wr) or 90)},
           'cities': cities, 'quotations': quotations, 'contracts': contracts}, open(out, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(out, 'written:', len(quotations), 'quotation rows,', len(contracts), 'contracts')
