# eval_loop_prompt.ps1: proves the AUTONOMOUS_LOOP_PROMPT is testable / its invariants hold.
# Run from repo root:  pwsh -File loops\eval_loop_prompt.ps1
# Exit 0 = all checks pass. Non-zero = a load-bearing invariant is unmet.
$ErrorActionPreference = "Stop"
$root   = Split-Path -Parent $PSScriptRoot
$prompt = Join-Path $PSScriptRoot "AUTONOMOUS_LOOP_PROMPT.md"
$fail   = @()

# E1: no em-dash anywhere in the authored prompt (house hard rule H1).
$emdash = Select-String -Path $prompt -Pattern ([char]0x2014) -SimpleMatch
if ($emdash) { $fail += "E1 em-dash present in prompt (lines: $($emdash.LineNumber -join ','))" }

# E2: the prompt forces a STRUCTURED per-iteration JSON object AND a verifier JSON object.
$txt = Get-Content $prompt -Raw
if ($txt -notmatch '"iteration"')        { $fail += "E2a missing per-iteration JSON object" }
if ($txt -notmatch '"verdict"\s*:\s*"PASS')  { $fail += "E2b missing verifier PASS/FAIL object" }

# E3: the gate appears as ONE contiguous ordered chain (lint->test->fitness->build->smoke200->a11y),
# proving smoke200 follows build. Collapse newlines so the chain that wraps across lines still matches;
# require the full ordered sequence to exist (the lone 'npm run build' in LBR-SERIAL cannot satisfy it).
$flat = ($txt -replace '\s+', ' ')
$chain = 'npm run lint.{0,12}npm run test.{0,12}npm run fitness.{0,12}npm run build.{0,16}npm run smoke200.{0,12}npm run a11y'
if ($flat -notmatch $chain) {
  $fail += "E3 the ordered gate chain (lint->test->fitness->build->smoke200->a11y) is not present contiguously; smoke200 must follow build"
}

# E4: every load-bearing rule is present (each LBR id appears).
foreach ($lbr in @('LBR-GUARD','LBR-KILL','LBR-REPORTONLY','LBR-LATER','LBR-DATA','LBR-MAKERCHECKER','LBR-GREEN-NEQ-VERIFIED','LBR-SERIAL','LBR-GATE','LBR-HOUSE')) {
  if ($txt -notmatch [regex]::Escape($lbr)) { $fail += "E4 missing $lbr" }
}

# E5: guard preconditions are referenced by name (STOP file, runlog, opt-in).
foreach ($g in @('loops/STOP','loops/runlog.jsonl','unattended_optin')) {
  if ($txt -notmatch [regex]::Escape($g)) { $fail += "E5 missing guard token $g" }
}

# E6: GROUND-TRUTH selector check against the REAL YAMLs: an item is eligible ONLY if
# status in {pending,open} AND report_only:false. report_only:true and later/shipped are excluded.
# We assert the real files still match the vocabulary the prompt's selector assumes.
$yamls = Get-ChildItem -Path (Join-Path $root 'loops'),(Join-Path $root 'loop_scratchpad') -Filter *.yaml
$statuses = Select-String -Path $yamls.FullName -Pattern 'status:\s*"?([a-z-]+)"?' |
  ForEach-Object { $_.Matches[0].Groups[1].Value } | Sort-Object -Unique
$allowed = @('pending','open','shipped','later','blocked','design-only')
$unknown = $statuses | Where-Object { $_ -notin $allowed }
if ($unknown) { $fail += "E6 real YAML carries unknown status value(s): $($unknown -join ',') (selector assumes the 6 known ones)" }

if ($fail.Count -gt 0) {
  Write-Host "EVAL FAIL:" -ForegroundColor Red
  $fail | ForEach-Object { Write-Host "  - $_" }
  exit 1
}
Write-Host "EVAL PASS: prompt is em-dash-clean, forces structured iteration + verifier JSON, names the gate in order, carries all 10 LBRs + the 3 guard tokens, and its selector vocabulary matches the live YAMLs (statuses seen: $($statuses -join ', '))." -ForegroundColor Green
exit 0
