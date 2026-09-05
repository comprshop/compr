param(
  [string]$ApiBaseUrl,
  [string]$SupabaseUrl = 'https://taosgvfdnblnopaywimf.supabase.co',
  [string]$SupabaseAnonKey = 'sb_publishable_cZtYQI3ApFTw8kU2a2AoBQ_nGdlSw1W',
  [string]$AuthCallbackUrl = 'https://comprshop.github.io/compr-website/auth-callback.html',
  [switch]$ValidationOnly,
  [switch]$UseTestFixture,
  [switch]$ShowInventory
)

$ErrorActionPreference = 'Stop'
if (-not $ValidationOnly) { throw 'This preparation script only permits -ValidationOnly; it never creates a ZIP or uploads anything.' }
if ($UseTestFixture -and $ApiBaseUrl) { throw 'Do not combine -UseTestFixture with -ApiBaseUrl.' }
$effectiveApi = if ($UseTestFixture) { 'https://api.compr.test' } elseif ($ApiBaseUrl) { $ApiBaseUrl.TrimEnd('/') } else { '' }
if (-not $effectiveApi) { throw 'SAFARI_PRODUCTION_API_URL_REQUIRED: supply the verified public HTTPS COMPR API URL.' }

$inputs = "$effectiveApi $SupabaseUrl $AuthCallbackUrl"
if ($inputs -match '(?i)(placeholder|replace[_-]?with|example\.(com|org|net)|\.invalid(?:/|\s|$))') { throw 'Placeholder configuration is forbidden.' }
if (-not $UseTestFixture -and $effectiveApi -notmatch '^https://') { throw 'The production COMPR API must use HTTPS.' }
if ($effectiveApi -match '(?i)(localhost|127\.0\.0\.1)' -or $SupabaseUrl -notmatch '^https://' -or $AuthCallbackUrl -notmatch '^https://') {
  throw 'Local or insecure endpoints are forbidden.'
}
if ($SupabaseAnonKey -match '(?i)(service.role|service_role|secret|sk_test|sk_live)' -or $SupabaseAnonKey.Length -lt 20) {
  throw 'Only a public Supabase anon/publishable key may enter the extension.'
}

$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'V.0.3-prototype'
$platform = Join-Path $root 'platforms\safari'
$requiredSource = @(
  'manifest.json','popup.html','popup.js','safari-popup.js','compare.html','compare.js','background.js','content.js',
  'auth-receiver.html','auth-receiver.js','privacy.md','shared\browserAdapter.js','shared\auth.js',
  'shared\apiClient.js','shared\storage.js','shared\reliability.js','shared\safariExperience.js','matching\productMatcher.js',
  'search\searchProvider.js','search\buildSearchQuery.js'
)
foreach ($item in $requiredSource) {
  $base = if ($item -eq 'manifest.json') { $platform } else { $source }
  if (-not (Test-Path -LiteralPath (Join-Path $base $item) -PathType Leaf)) { throw "Missing Safari build input: $item" }
}

Push-Location (Join-Path $root 'find-cheaper-backend')
try { & npm.cmd test; if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' } } finally { Pop-Location }
Push-Location $source
try {
  & node --test 'tests/integration.test.js' 'tests/browser-adapter.test.js' 'tests/safari-port.test.js'
  if ($LASTEXITCODE -ne 0) { throw 'Extension integration or Safari tests failed.' }
  & node 'tests/core.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Extension core tests failed.' }
  & node 'tests/find-cheaper.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Find This Cheaper tests failed.' }
} finally { Pop-Location }

$temporary = Join-Path (Join-Path $root 'tmp') ("safari-validation-" + [guid]::NewGuid().ToString('N'))
try {
  New-Item -ItemType Directory -Path $temporary -Force | Out-Null
  $files = @('popup.html','popup.js','safari-popup.js','compare.html','compare.js','background.js','content.js','auth-receiver.html','auth-receiver.js','privacy.md')
  $directories = @('icons','styles','shared','detectors','matching','compare','search')
  foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $source $file) -Destination $temporary }
  foreach ($directory in $directories) { Copy-Item -LiteralPath (Join-Path $source $directory) -Destination $temporary -Recurse }
  Copy-Item -LiteralPath (Join-Path $platform 'manifest.json') -Destination (Join-Path $temporary 'manifest.json')
  Copy-Item -LiteralPath (Join-Path $platform 'platform.js') -Destination (Join-Path $temporary 'platform.js')
  Remove-Item -LiteralPath (Join-Path $temporary 'search\demoCatalog.js') -Force
  Remove-Item -LiteralPath (Join-Path $temporary 'matching\matcherTest.js') -Force

  $popupPath = Join-Path $temporary 'popup.html'
  $popup = (Get-Content -Raw -LiteralPath $popupPath).Replace('<script src="popup.js"></script>', '<script src="platform.js"></script><script src="popup.js"></script>')
  Set-Content -LiteralPath $popupPath -Value $popup -Encoding utf8
  $comparePath = Join-Path $temporary 'compare.html'
  $compare = (Get-Content -Raw -LiteralPath $comparePath) -replace '\s*<script src="search/demoCatalog\.js"></script>', ''
  Set-Content -LiteralPath $comparePath -Value $compare -Encoding utf8

  $providerPath = Join-Path $temporary 'search\searchProvider.js'
  $provider = Get-Content -Raw -LiteralPath $providerPath
  $provider = $provider.Replace('const BACKEND_SEARCH_URL = "http://127.0.0.1:8787/api/search";', 'const BACKEND_SEARCH_URL = ComprRuntimeConfig.apiBaseUrl + "/api/search";')
  $provider = $provider.Replace('local-demo-catalog', 'backend').Replace('offline-demo', 'unavailable')
  $provider = $provider.Replace('ComprDemoCatalog', 'undefined')
  $provider = $provider.Replace('COMPR development backend unavailable; using offline demo', 'COMPR backend unavailable')
  Set-Content -LiteralPath $providerPath -Value $provider -Encoding utf8

  $runtimeMode = if ($UseTestFixture) { 'test-fixture' } else { 'production' }
  $runtime = @"
// Generated public Safari configuration. Never add private server secrets here.
const ComprRuntimeConfig = Object.freeze({
  apiBaseUrl: "$effectiveApi",
  supabaseUrl: "$($SupabaseUrl.TrimEnd('/'))",
  supabaseAnonKey: "$SupabaseAnonKey",
  authCallbackUrl: "$AuthCallbackUrl",
  mode: "$runtimeMode",
  betaMode: true,
  betaAccessUrl: "$(([uri]::new([uri]$AuthCallbackUrl, '.')).AbsoluteUri.TrimEnd('/'))/#beta-access",
  storeReviewUrl: "",
  platform: "safari",
  guestMode: true
});
"@
  Set-Content -LiteralPath (Join-Path $temporary 'shared\runtimeConfig.js') -Value $runtime -Encoding utf8

  $manifestPath = Join-Path $temporary 'manifest.json'
  $manifest = Get-Content -Raw -LiteralPath $manifestPath | ConvertFrom-Json
  $manifest.host_permissions = @("$effectiveApi/*", "$($SupabaseUrl.TrimEnd('/'))/*", 'https://www.ecb.europa.eu/*')
  $manifest.web_accessible_resources[0].matches = @((([uri]$AuthCallbackUrl).GetLeftPart('Authority')) + '/*')
  $manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding utf8

  if ($manifest.manifest_version -ne 3 -or $manifest.background.service_worker -ne 'background.js') { throw 'Safari MV3 manifest is invalid.' }
  if (@($manifest.permissions | Where-Object { $_ -notin @('storage','activeTab','scripting') }).Count) { throw 'Safari manifest requests an unexpected permission.' }
  if ($manifest.host_permissions -contains '<all_urls>') { throw 'Safari build may not request permanent all-sites access.' }
  if ($manifest.content_security_policy.extension_pages -ne "script-src 'self'; object-src 'self'") { throw 'Safari CSP is invalid.' }
  $forbidden = Get-ChildItem -LiteralPath $temporary -Recurse -File | Where-Object {
    $_.Name -match '(?i)(^\.env|\.test\.js$|test\.js$|readme|audit|checklist)' -or $_.Extension -in @('.zip','.ps1')
  }
  if ($forbidden) { throw "Development files entered the Safari build: $($forbidden.FullName -join ', ')" }
  $unsafe = Get-ChildItem -LiteralPath $temporary -Recurse -File | Select-String -Pattern 'sk_test_|sk_live_|whsec_|service_role|127\.0\.0\.1|localhost|demoCatalog|offline-demo|eval\s*\(|new\s+Function\s*\(' -AllMatches
  if ($unsafe) { throw 'Secret, development, demo or remote-code marker entered the Safari build.' }
  $inventory = Get-ChildItem -LiteralPath $temporary -Recurse -File | ForEach-Object { $_.FullName.Substring($temporary.Length + 1).Replace('\','/') } | Sort-Object
  if ($ShowInventory) { $inventory | ForEach-Object { Write-Host " - $_" } }
  Write-Host "Safari validation passed ($($inventory.Count) files); no artifact was retained."
} finally {
  if ((Test-Path -LiteralPath $temporary) -and $temporary.StartsWith((Join-Path $root 'tmp'), [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $temporary -Recurse -Force
  }
}
