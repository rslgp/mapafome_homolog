import sys, re, os
try:
    import yaml
except ImportError:
    print("NO_PYYAML"); sys.exit(2)

base = sys.argv[1] if len(sys.argv) > 1 else "."
M, R = os.path.join(base, "MILESTONES.yaml"), os.path.join(base, "ROADMAP.yaml")

# C1 parse
try:
    m = yaml.safe_load(open(M, encoding="utf-8"))
    r = yaml.safe_load(open(R, encoding="utf-8"))
    print("C1: parse OK")
except Exception as e:
    print("C1 FAIL:", e); sys.exit(1)

# C2 schema + gate-subset ; C4 dangling roadmap id
allowed = {"npm run lint","npm run test","npm run fitness","npm run build","npm run smoke200","npm run a11y"}
backend_ok = {"cd asaas-backend && npm test"}  # backend gate, explicitly allowed by the live plan
ids = set(); fail = []
for it in m["milestones"]:
    for k in ("id","tier","status","why"):
        if not it.get(k): fail.append(f"missing {k} in {it.get('id')}")
    if it.get("tier") not in {"S+","S","A","B"}: fail.append(f"bad tier {it.get('id')}={it.get('tier')}")
    if it.get("status") not in {"pending","open","shipped"}: fail.append(f"bad status {it.get('id')}={it.get('status')}")
    g = it.get("gate",[]) or []
    for c in g:
        if c not in allowed and c not in backend_ok:
            fail.append(f"bad gate cmd in {it.get('id')}: {c}")
    ids.add(it["id"])
for ph in r["phases"]:
    for d in ph.get("delivers",[]):
        if d not in ids: fail.append(f"dangling roadmap id {d} in {ph.get('id')}")
print("C2/C4 FAIL:", fail) if fail else print("C2/C4: OK ("+str(len(ids))+" milestones, "+str(len(r['phases']))+" phases)")

# smoke200-follows-build ordering inside each gate array
order_fail = []
for it in m["milestones"]:
    g = it.get("gate",[]) or []
    if "npm run smoke200" in g and "npm run build" in g:
        if g.index("npm run smoke200") < g.index("npm run build"):
            order_fail.append(it.get("id"))
print("C3 ORDER FAIL (smoke200 before build):", order_fail) if order_fail else print("C3: OK (smoke200 never precedes build)")

# C6 em-dash gate (em U+2014, en U+2013, horizontal-bar U+2015)
emfail = []
for f in (M, R):
    for i, line in enumerate(open(f, encoding="utf-8"), 1):
        if re.search("[—–―]", line):
            emfail.append(f"{f}:{i}: {line.strip()[:80]}")
print("C6 EMDASH FAIL:\n  " + "\n  ".join(emfail)) if emfail else print("C6: OK (no em-dash/en-dash)")

# C7 forbidden actions
forb = re.compile(r"git add -A|git add \.|git push|--force|\.claude/")
c7 = []
for f in (M, R):
    for i, line in enumerate(open(f, encoding="utf-8"), 1):
        if forb.search(line):
            c7.append(f"{f}:{i}: {line.strip()[:80]}")
print("C7 FORBIDDEN FAIL:\n  " + "\n  ".join(c7)) if c7 else print("C7: OK (no push/PR/version-bump/git add -A/.claude path)")

print("\nVERDICT:", "PASS" if not (fail or order_fail or emfail or c7) else "FAIL")
