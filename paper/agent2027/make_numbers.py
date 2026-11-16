#!/usr/bin/env python3
"""Generate every number, table and figure of the paper from the repository CSVs.

Usage:
    python3 paper/agent2027/make_numbers.py          # from the repository root
    python3 scripts/make_numbers.py [path/to/repo]   # from the private paper folder

The repository is found by walking up from this file until
experiments/e1/results/runs.csv exists; otherwise ../ddd-boundary-policing
next to the paper folder is used, or the path given as argument.
Outputs go to generated/ (LaTeX macros and tables) and figures/ (PDF), next
to this script (or next to its scripts/ folder in the paper folder).
Also writes generated/provenance.md: one line per number with its source.

Pure Python + matplotlib (no scipy): the exact tests are implemented below
and cross-checked against experiments/e1/results/summary.md.

Inputs (read-only):
  experiments/e1/results/runs.csv      one row per run (54), already crossed with
                                       the blind labels by the repository's aggregator
  experiments/e1/blind/labels.csv      blind labels (no arm/task information)
  experiments/e1/results/summary.md    used only for per-category detection (VP by
                                       category needs the blind mapping, which this
                                       script deliberately does not open)
  experiments/seeded/results/results.csv  seeded evaluation, one row per case
"""
import csv
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
HERE = SCRIPT_DIR.parent if SCRIPT_DIR.name == "scripts" else SCRIPT_DIR


def find_repo():
    if len(sys.argv) > 1:
        return Path(sys.argv[1])
    for d in [SCRIPT_DIR, *SCRIPT_DIR.parents]:
        if (d / "experiments/e1/results/runs.csv").exists():
            return d
    return HERE.parent / "ddd-boundary-policing"


REPO = find_repo()
GEN = HERE / "generated"
FIG = HERE / "figures"
GEN.mkdir(exist_ok=True)
FIG.mkdir(exist_ok=True)

RUNS = REPO / "experiments/e1/results/runs.csv"
LABELS = REPO / "experiments/e1/blind/labels.csv"
SUMMARY = REPO / "experiments/e1/results/summary.md"
SEEDED = REPO / "experiments/seeded/results/results.csv"

macros = {}      # name -> value (string)
prov = []        # (macro, value, source)


def put(name, value, source):
    macros[name] = str(value)
    prov.append((name, str(value), source))


def pct(a, b, digits=1):
    return f"{100 * a / b:.{digits}f}"


# ---------------------------------------------------------------- statistics
def hyper_pmf(k, n1, n2, m):
    """P(X=k): X successes in group 1 (size n1) given m total successes."""
    return math.comb(n1, k) * math.comb(n2, m - k) / math.comb(n1 + n2, m)


def fisher(a, n1, b, n2):
    """2x2 Fisher exact test. a/n1 = group1 successes/size, b/n2 likewise.
    Returns (one-sided p for group1 > group2, two-sided p)."""
    m = a + b
    lo, hi = max(0, m - n2), min(n1, m)
    probs = {k: hyper_pmf(k, n1, n2, m) for k in range(lo, hi + 1)}
    one = sum(p for k, p in probs.items() if k >= a)
    p_obs = probs[a]
    two = sum(p for p in probs.values() if p <= p_obs * (1 + 1e-7))
    return min(one, 1.0), min(two, 1.0)


def mann_whitney(x, y):
    """U for x (> y alternative), normal approximation with tie and
    continuity correction, as in the repository's aggregator."""
    allv = sorted((v, i) for i, v in enumerate(x + y))
    ranks = [0.0] * len(allv)
    i = 0
    vals = [v for v, _ in allv]
    tie_term = 0
    while i < len(vals):
        j = i
        while j + 1 < len(vals) and vals[j + 1] == vals[i]:
            j += 1
        r = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[allv[k][1]] = r
        t = j - i + 1
        tie_term += t ** 3 - t
        i = j + 1
    n1, n2 = len(x), len(y)
    r1 = sum(ranks[:n1])
    u1 = r1 - n1 * (n1 + 1) / 2
    n = n1 + n2
    mu = n1 * n2 / 2
    sigma = math.sqrt(n1 * n2 / 12 * ((n + 1) - tie_term / (n * (n - 1))))
    z = (abs(u1 - mu) - 0.5) / sigma if sigma > 0 else 0.0
    z_signed = z if u1 >= mu else -z
    phi = lambda v: 0.5 * (1 + math.erf(v / math.sqrt(2)))
    p_one = 1 - phi(z_signed)
    p_two = min(1.0, 2 * (1 - phi(z)))
    return u1, z_signed, p_one, p_two


def fmt_p(p):
    if p < 0.001:
        return "<0.001"
    return f"{p:.3f}"


# ---------------------------------------------------------------- load
runs = list(csv.DictReader(open(RUNS)))
labels = list(csv.DictReader(open(LABELS)))
seeded = list(csv.DictReader(open(SEEDED)))
assert len(runs) == 54, len(runs)
ARMS = ["A", "B", "C"]
TASKS = [f"T{i}" for i in range(1, 7)]
SRC_RUNS = "experiments/e1/results/runs.csv"
SRC_LAB = "experiments/e1/blind/labels.csv"

for r in runs:
    r["cats"] = r["gt_categories"].split() if r["gt_categories"] else []
    r["nviol"] = int(r["gt_violations"])
    r["structural"] = any(c in ("V1", "V2", "V3", "V4", "V5") for c in r["cats"])
    r["semantic_only"] = bool(r["cats"]) and not r["structural"]
    r["gate_failed"] = r["gate_passed"] == "false"

by_arm = {a: [r for r in runs if r["arm"] == a] for a in ARMS}

# ---------------------------------------------------------------- label-level facts
lab_by_diff = defaultdict(list)
for l in labels:
    lab_by_diff[l["blind_id"]].append(l)
viol_labels = [l for l in labels if l["category"] != "NONE"]
v1b = [l for l in viol_labels if l["subcategory"].startswith("V1.b-new-relation")]
v1_other = [l for l in viol_labels if l["category"] == "V1" and not l["subcategory"].startswith("V1.b")]
put("nDiffs", len(lab_by_diff), f"{SRC_LAB}: distinct blind_id")
put("nLabelsViol", len(viol_labels), f"{SRC_LAB}: rows with category != NONE (before the declared/undeclared split)")
put("nVOneBLabels", len(v1b), f"{SRC_LAB}: subcategory starts with V1.b-new-relation")
# Assumption checks used for the sensitivity analysis (no mapping needed):
#  (i) the only V1 labels that are not V1.b co-occur with a V3 label in the same diff;
#  (ii) every diff with a V3 label has exactly one V1.b label.
for l in v1_other:
    assert any(x["category"] == "V3" for x in lab_by_diff[l["blind_id"]]), l
v3_diffs = {l["blind_id"] for l in viol_labels if l["category"] == "V3"}
for d in v3_diffs:
    assert sum(1 for x in lab_by_diff[d] if x["subcategory"].startswith("V1.b")) == 1, d
put("nVThreeDiffs", len(v3_diffs), f"{SRC_LAB}: diffs with at least one V3 label")

# ---------------------------------------------------------------- per-arm table
def nonv1b_count(r):
    """Violations of a run after removing undeclared V1.b (sensitivity analysis).
    Runs whose only category is V1 contain only V1.b labels (check (i) above);
    runs with V3 contain exactly one V1.b label (check (ii))."""
    if not r["cats"]:
        return 0
    if set(r["cats"]) == {"V1"}:
        return 0
    if "V3" in r["cats"]:
        return r["nviol"] - 1
    return r["nviol"]


arm_rows = []
for a in ARMS:
    rs = by_arm[a]
    n = len(rs)
    withv = sum(1 for r in rs if r["nviol"] > 0)
    withv_s = sum(1 for r in rs if nonv1b_count(r) > 0)
    struct = sum(1 for r in rs if r["structural"])
    sem = sum(1 for r in rs if r["semantic_only"])
    tot = sum(r["nviol"] for r in rs)
    tot_s = sum(nonv1b_count(r) for r in rs)
    gate_fail = sum(1 for r in rs if r["gate_failed"])
    acc = sum(1 for r in rs if r["acceptance_passed"] == "true")
    npm = sum(1 for r in rs if r["npm_test_passed"] == "true")
    cost = sum(float(r["cost_usd"]) for r in rs) / n
    turns = sum(int(r["num_turns"]) for r in rs) / n
    dur = sum(int(r["duration_s"]) for r in rs) / n / 60
    declared = sum(1 for r in rs if r["context_map_declared"] == "1")
    gate_by_agent = [int(r["gate_runs_by_agent"]) for r in rs]
    L = a  # macro suffix
    put(f"runs{L}", n, f"{SRC_RUNS}: rows with arm={a}")
    put(f"withV{L}", withv, f"{SRC_RUNS}: arm={a}, gt_violations>0")
    put(f"withVS{L}", withv_s, f"{SRC_RUNS}+{SRC_LAB}: arm={a}, violations after removing undeclared V1.b > 0 (see nonv1b_count)")
    put(f"struct{L}", struct, f"{SRC_RUNS}: arm={a}, gt_categories contains V1..V5")
    put(f"semOnly{L}", sem, f"{SRC_RUNS}: arm={a}, gt_categories == V6 only")
    put(f"totV{L}", tot, f"{SRC_RUNS}: arm={a}, sum gt_violations")
    put(f"totVS{L}", tot_s, f"{SRC_RUNS}+{SRC_LAB}: arm={a}, sum of violations without undeclared V1.b")
    put(f"meanV{L}", f"{tot / n:.2f}", f"{SRC_RUNS}: arm={a}, mean gt_violations")
    put(f"meanVS{L}", f"{tot_s / n:.2f}", f"{SRC_RUNS}+{SRC_LAB}: arm={a}, mean without undeclared V1.b")
    put(f"gateFail{L}", gate_fail, f"{SRC_RUNS}: arm={a}, gate_passed=false")
    put(f"accept{L}", acc, f"{SRC_RUNS}: arm={a}, acceptance_passed=true")
    put(f"npm{L}", npm, f"{SRC_RUNS}: arm={a}, npm_test_passed=true")
    put(f"cost{L}", f"{cost:.2f}", f"{SRC_RUNS}: arm={a}, mean cost_usd (API-price estimate)")
    put(f"turns{L}", f"{turns:.1f}", f"{SRC_RUNS}: arm={a}, mean num_turns")
    put(f"dur{L}", f"{dur:.1f}", f"{SRC_RUNS}: arm={a}, mean duration_s / 60")
    put(f"declared{L}", declared, f"{SRC_RUNS}: arm={a}, context_map_declared=1")
    put(f"decisions{L}", withv, f"{SRC_RUNS}: arm={a}; violating design decisions = runs with >=1 violation, because every run has at most one violating decision under the grouping of blind/revisao-humana.md (see notas)")
    if a == "C":
        put("gateByAgentMin", min(gate_by_agent), f"{SRC_RUNS}: arm=C, min gate_runs_by_agent")
        put("gateByAgentMax", max(gate_by_agent), f"{SRC_RUNS}: arm=C, max gate_runs_by_agent")
        put("gateByAgentAll", sum(1 for g in gate_by_agent if g >= 1), f"{SRC_RUNS}: arm=C, runs with gate_runs_by_agent>=1")
    arm_rows.append((a, n, withv, withv_s, tot, tot_s, struct, sem, gate_fail, acc, cost, turns))

# ---------------------------------------------------------------- tests A vs B
def counts(a, f):
    return sum(1 for r in by_arm[a] if f(r))

fa, fb = counts("A", lambda r: r["nviol"] > 0), counts("B", lambda r: r["nviol"] > 0)
p1, p2 = fisher(fa, 18, fb, 18)
put("fisherOne", fmt_p(p1), "Fisher exact, one-sided A>B, runs with >=1 violation (computed here)")
put("fisherTwo", fmt_p(p2), "Fisher exact, two-sided")
fa_s, fb_s = counts("A", lambda r: nonv1b_count(r) > 0), counts("B", lambda r: nonv1b_count(r) > 0)
p1s, p2s = fisher(fa_s, 18, fb_s, 18)
put("fisherOneS", fmt_p(p1s), "Fisher exact, one-sided, without undeclared V1.b")
put("fisherTwoS", fmt_p(p2s), "Fisher exact, two-sided, without undeclared V1.b")
u, z, mp1, mp2 = mann_whitney([r["nviol"] for r in by_arm["A"]], [r["nviol"] for r in by_arm["B"]])
put("mwU", f"{u:.1f}", "Mann-Whitney U (A>B), normal approx., tie+continuity correction")
put("mwOne", fmt_p(mp1), "Mann-Whitney one-sided p")
us, zs, mp1s, mp2s = mann_whitney([nonv1b_count(r) for r in by_arm["A"]], [nonv1b_count(r) for r in by_arm["B"]])
put("mwUS", f"{us:.1f}", "Mann-Whitney U without undeclared V1.b")
put("mwOneS", fmt_p(mp1s), "Mann-Whitney one-sided p without undeclared V1.b")
fbc = counts("C", lambda r: r["nviol"] > 0)
pbc1, pbc2 = fisher(fbc, 18, fb, 18)
put("fisherCBTwo", fmt_p(pbc2), "Fisher exact, two-sided, C vs B (exploratory)")

# Cross-check with the repository's own summary (same tests, same data).
summ = SUMMARY.read_text()
for needle in ["| A 10/18 · B 3/18 | 0.018 | 0.035 |", "| A 4/18 · B 3/18 | 0.500 | 1.000 |",
               "| 234.0 | 2.66 | 0.004 | 0.008 |", "| 175.5 | 0.62 | 0.276 | 0.551 |"]:
    assert needle in summ, needle
assert (fa, fb, fmt_p(p1), fmt_p(p2)) == (10, 3, "0.018", "0.035"), (fa, fb, p1, p2)
assert (fa_s, fb_s, fmt_p(p1s), fmt_p(p2s)) == (4, 3, "0.500", "1.000"), (fa_s, fb_s, p1s, p2s)
assert (f"{u:.1f}", fmt_p(mp1)) == ("234.0", "0.004"), (u, mp1)
assert (f"{us:.1f}", fmt_p(mp1s)) == ("175.5", "0.276"), (us, mp1s)

# ---------------------------------------------------------------- categories x arm
cat_arm = {a: Counter() for a in ARMS}
# Category counts per arm need per-label arm information. runs.csv has the
# category set per run and the total count; per-category counts per arm are
# read from the summary table and checked against runs.csv totals.
m = re.search(r"## Violações por categoria × braço.*?\n\n(\|.*?)\n\n", summ, re.S)
for line in m.group(1).splitlines()[2:]:
    cells = [c.strip().strip("*") for c in line.strip("|").split("|")]
    if cells[0].startswith("Total"):
        continue
    for a, v in zip(ARMS, cells[1:]):
        cat_arm[a][cells[0]] = int(v)
for a in ARMS:
    assert sum(cat_arm[a].values()) == sum(r["nviol"] for r in by_arm[a]), a
    for c in ["V1", "V3", "V6"]:
        put(f"cat{c.replace('V1','One').replace('V3','Three').replace('V6','Six')}{a}", cat_arm[a][c],
            "experiments/e1/results/summary.md, table 'Violações por categoria × braço' (totals checked against runs.csv)")
put("vOneBUndeclared", cat_arm["A"]["V1"] - len(v1_other), f"summary.md (V1 in arm A) minus non-V1.b V1 labels in {SRC_LAB}")
put("vOneBDeclared", len(v1b) - (cat_arm["A"]["V1"] - len(v1_other)), f"{SRC_LAB}: V1.b labels minus undeclared ones")

# ---------------------------------------------------------------- task x arm
task_rows = []
for t in TASKS:
    row = [t]
    for a in ARMS:
        rs = [r for r in by_arm[a] if r["task"] == t]
        s = sum(1 for r in rs if r["structural"])
        v = sum(1 for r in rs if r["semantic_only"])
        g = sum(1 for r in rs if r["gate_failed"])
        row.append((s, v, g, len(rs)))
    task_rows.append(row)
t4 = {a: next(x for x in task_rows if x[0] == "T4")[ARMS.index(a) + 1] for a in ARMS}
put("tFourStructA", t4["A"][0], f"{SRC_RUNS}: T4, arm A, structural runs")
put("tFourStructB", t4["B"][0], f"{SRC_RUNS}: T4, arm B, structural runs")
put("tFourSemB", t4["B"][1], f"{SRC_RUNS}: T4, arm B, V6-only runs")
put("tFourSemC", t4["C"][1], f"{SRC_RUNS}: T4, arm C, V6-only runs")

# ---------------------------------------------------------------- gate, run level
struct_runs = [r for r in runs if r["structural"]]
sem_runs = [r for r in runs if r["semantic_only"]]
clean_runs = [r for r in runs if r["nviol"] == 0]
put("structRuns", len(struct_runs), f"{SRC_RUNS}: runs with V1..V5")
put("structRunsFailed", sum(r["gate_failed"] for r in struct_runs), f"{SRC_RUNS}: of those, gate_passed=false")
put("structRunsMatched", sum(1 for r in struct_runs if int(r["gt_detected"]) > 0), f"{SRC_RUNS}: of those, gt_detected>0 (gate flagged a labelled violation)")
put("structRunsWrongReason", sum(1 for r in struct_runs if r["gate_failed"] and int(r["gt_detected"]) == 0), f"{SRC_RUNS}: failed but gt_detected=0 (T3-A: R2 on billing's own new contract)")
put("semRuns", len(sem_runs), f"{SRC_RUNS}: runs with V6 only")
put("semRunsFailed", sum(r["gate_failed"] for r in sem_runs), f"{SRC_RUNS}: of those, gate_passed=false")
put("cleanRuns", len(clean_runs), f"{SRC_RUNS}: runs without labelled violation")
put("cleanRunsFailed", sum(r["gate_failed"] for r in clean_runs), f"{SRC_RUNS}: of those, gate_passed=false")
put("violRuns", sum(1 for r in runs if r["nviol"] > 0), f"{SRC_RUNS}: runs with >=1 violation")
put("violRunsFailed", sum(1 for r in runs if r["nviol"] > 0 and r["gate_failed"]), f"{SRC_RUNS}: of those, gate failed")
assert sum(r["gate_failed"] for r in struct_runs) == len(struct_runs)
assert sum(r["gate_failed"] for r in sem_runs) == 0 and sum(r["gate_failed"] for r in clean_runs) == 0

# ---------------------------------------------------------------- detection per label
tp = sum(int(r["gt_detected"]) for r in runs)
real = sum(r["nviol"] for r in runs)
fp = sum(int(r["gate_false_positives"]) for r in runs)
put("detTP", tp, f"{SRC_RUNS}: sum gt_detected")
put("detReal", real, f"{SRC_RUNS}: sum gt_violations")
put("detPct", pct(tp, real), "detTP/detReal")
put("detFP", fp, f"{SRC_RUNS}: sum gate_false_positives")
mdet = re.search(r"\| Categoria \| Violações reais \(agente\).*?\n\n", summ, re.S).group(0)
det = {}
for line in mdet.splitlines()[2:]:
    if not line.startswith("| V"):
        continue
    cells = [c.strip() for c in line.strip("|").split("|")]
    det[cells[0]] = (int(cells[1]), int(cells[2]))
assert sum(v[1] for v in det.values()) == tp and sum(v[0] for v in det.values()) == real
for c, name in [("V1", "One"), ("V3", "Three"), ("V6", "Six")]:
    put(f"det{name}TP", det[c][1], "summary.md, detection table (VP by category; totals checked against runs.csv)")
    put(f"det{name}N", det[c][0], "summary.md, detection table")

# ---------------------------------------------------------------- seeded baseline
viol_cases = [s for s in seeded if s["category"] != "CONTROL-LEGIT"]
ctrl = [s for s in seeded if s["category"] == "CONTROL-LEGIT"]
s_tp = sum(1 for s in viol_cases if s["classification"] == "TP")
s_fn = sum(1 for s in viol_cases if s["classification"] == "FN")
s_fp = sum(1 for s in ctrl if s["classification"] == "FP")
static = [s for s in viol_cases if s["category"] in ("V1", "V2", "V3", "V4", "V5")]
s_tp_static = sum(1 for s in static if s["classification"] == "TP")
SRC_S = "experiments/seeded/results/results.csv"
put("seedCases", len(seeded), f"{SRC_S}: rows")
put("seedViol", len(viol_cases), f"{SRC_S}: category != CONTROL-LEGIT")
put("seedCtrl", len(ctrl), f"{SRC_S}: CONTROL-LEGIT")
put("seedTP", s_tp, f"{SRC_S}: classification TP")
put("seedFP", s_fp, f"{SRC_S}: classification FP")
put("seedPrecision", pct(s_tp, s_tp + s_fp), "seedTP/(seedTP+seedFP)")
put("seedStatic", len(static), f"{SRC_S}: V1..V5 cases")
put("seedStaticTP", s_tp_static, f"{SRC_S}: V1..V5 TP")
put("seedRecallStatic", pct(s_tp_static, len(static)), "seedStaticTP/seedStatic")
put("seedRecallAll", pct(s_tp, len(viol_cases)), "seedTP/seedViol")
seed_cat = {}
for c in ["V1", "V2", "V3", "V4", "V5", "V6"]:
    cs = [s for s in viol_cases if s["category"] == c]
    seed_cat[c] = (sum(1 for s in cs if s["classification"] == "TP"), len(cs))
for c, name in [("V1", "One"), ("V3", "Three"), ("V6", "Six")]:
    put(f"seed{name}", f"{seed_cat[c][0]}/{seed_cat[c][1]}", f"{SRC_S}: {c} TP/cases")
gate_ms = sorted(int(s["gate_ms"]) for s in seeded)
put("seedGateMs", round(sum(gate_ms) / len(gate_ms)), f"{SRC_S}: mean gate_ms")
assert pct(s_tp, s_tp + s_fp) == "96.4" and pct(s_tp_static, len(static)) == "71.1"

# ---------------------------------------------------------------- LaTeX output
with open(GEN / "numbers.tex", "w") as f:
    f.write("% Generated by scripts/make_numbers.py. Do not edit.\n")
    for k, v in macros.items():
        v = v.replace("<", "$<$")
        f.write(f"\\newcommand{{\\{k}}}{{{v}}}\n")

# Table: per arm
with open(GEN / "tab_arms.tex", "w") as f:
    f.write("% Generated by scripts/make_numbers.py. Do not edit.\n")
    f.write("\\begin{tabular}{@{}lrrrrr@{}}\n\\toprule\n")
    f.write(" & \\multicolumn{2}{c}{Runs w/ $\\geq$1 viol.} & \\multicolumn{2}{c}{Violations (mean)} & Gate \\\\\n")
    f.write("\\cmidrule(lr){2-3}\\cmidrule(lr){4-5}\n")
    f.write("Arm & all & w/o V1.b$_u$ & all & w/o V1.b$_u$ & failed \\\\\n\\midrule\n")
    for (a, n, wv, wvs, tot, tots, st, se, gf, acc, cost, turns) in arm_rows:
        f.write(f"{a} & {wv}/{n} & {wvs}/{n} & {tot} ({tot/n:.2f}) & {tots} ({tots/n:.2f}) & {gf}/{n} \\\\\n")
    f.write("\\bottomrule\n\\end{tabular}\n")

# Table: categories x arm and detection vs seeded
with open(GEN / "tab_detection.tex", "w") as f:
    f.write("% Generated by scripts/make_numbers.py. Do not edit.\n")
    f.write("\\begin{tabular}{@{}lcccrr@{}}\n\\toprule\n")
    f.write(" & \\multicolumn{3}{c}{Labels} & \\multicolumn{2}{c}{Gate detection} \\\\\n")
    f.write("\\cmidrule(lr){2-4}\\cmidrule(lr){5-6}\n")
    f.write("Cat. & A & B & C & agent (E1) & seeded \\\\\n\\midrule\n")
    for c in ["V1", "V2", "V3", "V4", "V5", "V6"]:
        n_real, n_tp = det.get(c, (0, 0))
        agent = f"{n_tp}/{n_real}" if n_real else "--"
        st, sn = seed_cat[c]
        f.write(f"{c} & {cat_arm['A'][c]} & {cat_arm['B'][c]} & {cat_arm['C'][c]} & {agent} & {st}/{sn} \\\\\n")
    f.write("\\midrule\n")
    f.write(f"Total & {sum(cat_arm['A'].values())} & {sum(cat_arm['B'].values())} & {sum(cat_arm['C'].values())} & {tp}/{real} ({pct(tp, real)}\\%) & {s_tp}/{len(viol_cases)} ({pct(s_tp, len(viol_cases))}\\%) \\\\\n")
    f.write("\\bottomrule\n\\end{tabular}\n")

# ---------------------------------------------------------------- figure
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

plt.rcParams.update({"font.size": 8, "font.family": "serif", "hatch.linewidth": 0.6})
fig, ax = plt.subplots(figsize=(3.45, 2.0))
width = 0.26
for ti, row in enumerate(task_rows):
    for ai, a in enumerate(ARMS):
        s, v, g, n = row[ai + 1]
        x = ti + (ai - 1) * width
        ax.bar(x, s, width * 0.92, color="0.15", edgecolor="black", linewidth=0.5)
        ax.bar(x, v, width * 0.92, bottom=s, color="white", edgecolor="black", hatch="////", linewidth=0.5)
        ax.text(x, -0.22, a, ha="center", va="center", fontsize=6)
ax.set_xticks(range(len(TASKS)))
ax.set_xticklabels(TASKS)
ax.tick_params(axis="x", pad=13, length=0)
ax.set_ylim(0, 3.3)
ax.set_yticks([0, 1, 2, 3])
ax.set_ylabel("runs (of 3)")
for side in ("top", "right"):
    ax.spines[side].set_visible(False)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(facecolor="0.15", edgecolor="black", label="structural (V1–V5)"),
                   Patch(facecolor="white", edgecolor="black", hatch="////", label="semantic only (V6)")],
          loc="lower center", bbox_to_anchor=(0.5, 1.0), ncol=2, frameon=False, fontsize=6.5, handlelength=1.5)
fig.tight_layout(pad=0.2)
fig.savefig(FIG / "runs_by_task.pdf", metadata={"CreationDate": None})

# ---------------------------------------------------------------- provenance
with open(GEN / "provenance.md", "w") as f:
    f.write("# Provenance of every number (generated by scripts/make_numbers.py)\n\n")
    f.write("Repository: `ddd-boundary-policing` (tag `e1-baseline` plus the committed E1 results); paths below are relative to it.\n\n| Macro | Value | Source |\n|---|---|---|\n")
    for k, v, s in prov:
        f.write(f"| `\\{k}` | {v} | {s} |\n")
print(f"OK: {len(macros)} macros, tables and figure written.")
