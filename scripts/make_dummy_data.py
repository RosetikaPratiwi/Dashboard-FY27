"""Creates DUMMY data in data/data.json (safe for a public repo)."""
import json, random, datetime as dt
random.seed(27)
PICS = ['ADI', 'BUDI', 'CITRA', 'DEWI', 'EKA', 'FAJAR']
CITIES = {'Jakarta': (-6.2, 106.8), 'Bandung': (-6.9, 107.6), 'Semarang': (-7.0, 110.4), 'Yogyakarta': (-7.8, 110.4), 'Surabaya': (-7.25, 112.75),
          'Denpasar': (-8.65, 115.2), 'Medan': (3.6, 98.7), 'Padang': (-0.95, 100.35), 'Palembang': (-2.98, 104.75), 'Pontianak': (-0.03, 109.3),
          'Banjarmasin': (-3.3, 114.6), 'Balikpapan': (-1.27, 116.8), 'Makassar': (-5.15, 119.4), 'Manado': (1.5, 124.85), 'Jayapura': (-2.55, 140.7)}
EXTRA = ['Lahat', 'Bangka']  # not in the city table -> shown as "Not Mapped"
MODS = [('MR Scanner', 'MR'), ('CT Scanner', 'CT'), ('Ultrasound', 'US'), ('X-Ray', 'XP'), ('Angiography', 'AX')]
rows = []
for i in range(180):
    st = random.choices(['On Progress', 'Committed', 'Booked', 'Abandoned'], [60, 12, 25, 3])[0]
    prog = {'On Progress': random.choice([0.2, 0.4, 0.4, 0.6]), 'Committed': 0.8, 'Booked': 1, 'Abandoned': 0}[st]
    vy = random.randint(80, 900) * 1_000_000
    yrs = random.choice([1, 1, 2, 3])
    mod = random.choice(MODS)
    rows.append({'period': 'P%d' % random.randint(1, 12), 'oppty': str(2400000 + i // 2), 'pic': random.choice(PICS), 'modality': mod[0], 'bu': mod[1],
                 'eqNo': str(1050000000 + i), 'serial': str(10000 + i), 'shipTo': 'Sample Hospital %02d' % (i % 40 + 1), 'customer': 'Sample Hospital %02d' % (i % 40 + 1),
                 'status': st, 'progress': prog, 'sla': random.choice(['Not Yet', 'Yes']), 'valueYear': vy, 'margin': None,
                 'city': random.choice(list(CITIES) + EXTRA), 'contractPeriod': yrs, 'totalValue': vy * yrs, 'vertical': random.choice(['Yes', 'No'])})
today = dt.date.today()
contracts = [{'bu': random.choice(MODS)[1], 'equipment': random.choice(MODS)[0], 'serial': str(20000 + i), 'eqNo': str(1020000000 + i),
              'customer': 'Sample Hospital %02d' % (i % 40 + 1), 'city': random.choice(list(CITIES)), 'type': random.choice(['Full Service', 'Partial', 'Warranty Ext']),
              'end': (today + dt.timedelta(days=random.randint(1, 700))).isoformat(), 'pic': random.choice(PICS)} for i in range(320)]
json.dump({'updated': dt.datetime.now().strftime('%Y-%m-%d %H:%M'), 'targets': {'booked': [3_000_000_000 + 250_000_000 * i for i in range(12)], 'committed': [1_500_000_000 + 100_000_000 * i for i in range(12)]}, 'thresholds': {'kritis': 30, 'warning': 90},
           'cities': {k: list(v) for k, v in CITIES.items()}, 'quotations': rows, 'contracts': contracts}, open('data/data.json', 'w'), separators=(',', ':'))
print('data/data.json written (DUMMY data)')
