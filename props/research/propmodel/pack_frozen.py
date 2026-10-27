#!/usr/bin/env python3
"""The durable copies of the frozen models and of the two raw files the test restores, in the repo.

The 97 model files freeze.py wrote (about 73 MB) live in DIR/frozen, outside the repo, where a lost scratch
directory would take them with it; a refit cannot stand in for them, since players.csv, one of the inputs the
manifest records, is a current master nflverse rewrites near daily. So each model file is kept gzipped in the repo,
at frozen/models/<file>.gz (about 26 MB), and predict.py reads a copy wherever DIR/frozen lacks the file, holding its
decompressed bytes to the manifest's SHA-256. players.csv and games_to2025.csv, the two inputs nflverse can rewrite
that the one-shot test restores when DIR/raw lacks them, are kept the same way at frozen/inputs/<file>.gz.

Every copy is written deterministically (gzip level 9, no file name or time in the header), and every file is
checked against the manifest before it is copied: a file with another hash is refused.

    python3 -I pack_frozen.py --data DIR          # writes frozen/models/ and frozen/inputs/
    python3 -I pack_frozen.py --data DIR --check  # only checks that every copy decompresses to the manifest's bytes
"""
import argparse, gzip, hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
MANIFEST = os.path.join(HERE, 'frozen', 'MANIFEST.json')
INPUTS = ('players.csv', 'games_to2025.csv')


def model_files(man):
    out = [f for S in man['yards']['stats'].values() for f in S['files']]
    out += list(man['counts']['targets'].values()) + list(man['td']['groups'].values())
    return [(f['file'], f['sha256']) for f in out]


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--data', default=os.environ.get('PROPMODEL_DATA'))
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    man = json.load(open(MANIFEST))
    jobs = [(os.path.join(a.data or '', 'frozen', f), os.path.join(HERE, 'frozen', 'models', f + '.gz'), h)
            for f, h in model_files(man)]
    jobs += [(os.path.join(a.data or '', 'raw', f), os.path.join(HERE, 'frozen', 'inputs', f + '.gz'),
              man['fitted_on']['raw_sha256'][f]) for f in INPUTS]
    bad, size = [], 0
    for src, dest, h in jobs:
        if not a.check:
            with open(src, 'rb') as f:
                raw = f.read()
            if hashlib.sha256(raw).hexdigest() != h:
                sys.exit(f'refused: {src} is not the manifest\'s file')
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            with open(dest + '.part', 'wb') as f:
                f.write(gzip.compress(raw, compresslevel=9, mtime=0))
            os.replace(dest + '.part', dest)
        with open(dest, 'rb') as f:
            z = f.read()
        size += len(z)
        if hashlib.sha256(gzip.decompress(z)).hexdigest() != h:
            bad.append(dest)
    print(f'{len(jobs)} copies, {size / 1e6:.1f} MB, {len(bad)} not the manifest\'s bytes', bad[:5])
    if bad:
        sys.exit(1)


if __name__ == '__main__':
    main()
