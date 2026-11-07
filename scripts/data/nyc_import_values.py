"""NYCPS source values: suppression is missing, while a genuine zero stays zero."""
import math

def number(v, percent=False):
    if v is None or str(v).strip().lower().replace('%', '') in ('', 's', 'na', 'n/a', '-', '*', '<5', '<10', 'above 95', 'below 5'):
        return None
    n = float(str(v).replace(',', '').replace('%', ''))
    if not math.isfinite(n) or n < 0:
        raise ValueError('Invalid numeric value ' + str(v))
    if percent and n > 100.0001:
        raise ValueError('Out-of-range percentage ' + str(v))
    return round(n, 1) if percent else int(n) if n.is_integer() else n

def demographic_percent(v):
    n = number(v)
    if n is not None and n > 1.00001:
        raise ValueError('Expected a demographic fraction from 0 to 1')
    return round(n * 100, 1) if n is not None else None

def exam(v):
    # Match legacy spelling only; do not combine distinct curriculum exams.
    s = v.strip()
    return {'English':'English Language Arts', 'Algebra2/Trigonometry':'Algebra II / Trigonometry',
        'Global History and Geography':'Global History & Geography',
        'US History and Government':'US History & Government', 'Physical Settings/Chemistry':'Chemistry',
        'Physical Settings/Earth Science':'Earth Science', 'Physical Settings/Physics':'Physics'}.get(s, s)
