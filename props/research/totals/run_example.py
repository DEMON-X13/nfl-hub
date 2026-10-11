import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import harness
from candidates import example_interface as ex
G = harness.load()
print('dev load: seasons', G.season.min(), '-', G.season.max(), 'rows', len(G))
try:
    harness.evaluate(ex, periods=[2023, 2024])
except PermissionError as e:
    print('refused:', e)
r = harness.evaluate(ex)
c = r['results'][0]['candidate']
print('returned keys:', sorted(k for k in c if k != 'calib_table'))
