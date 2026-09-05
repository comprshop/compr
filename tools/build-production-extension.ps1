param(
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$ApiBaseUrl,
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$SupabaseUrl,
  [Parameter(Mandatory = $true)][string]$SupabaseAnonKey,
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$AuthCallbackUrl,
  [Parameter(Mandatory = $true)][ValidatePattern('^https://')][string]$ChromeStoreUrl,
  [switch]$ValidationOnly,
  [switch]$CreateRelease
)

$ErrorActionPreference = 'Stop'
if ($ValidationOnly -eq $CreateRelease) { throw 'Choose exactly one mode: -ValidationOnly or -CreateRelease.' }
$allInputs = "$ApiBaseUrl $SupabaseUrl $SupabaseAnonKey $AuthCallbackUrl $ChromeStoreUrl"
if ($allInputs -match '(?i)(placeholder|replace[_-]?with|example\.(com|org|net)|\.invalid(?:/|\s|$))') {
  throw 'Placeholder configuration is forbidden, including in validation-only mode.'
}
if ($SupabaseAnonKey -match '(?i)(service.role|service_role|secret|sk_test|sk_live)' -or $SupabaseAnonKey.Length -lt 20) {
  throw 'The extension build requires a public Supabase anon/publishable key, never a privileged secret.'
}
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'V.0.3-prototype'
$buildRoot = Join-Path $root 'dist'
$target = Join-Path $buildRoot 'compr-extension'
$callbackUri = [uri]$AuthCallbackUrl
$websiteBaseUrl = ([uri]::new($callbackUri, '.')).AbsoluteUri.TrimEnd('/')

Push-Location (Join-Path $root 'find-cheaper-backend')
try {
  & npm.cmd test; if ($LASTEXITCODE -ne 0) { throw 'Backend tests failed.' }
  & npm.cmd audit --omit=dev --offline; if ($LASTEXITCODE -ne 0) { throw 'Local dependency audit failed.' }
} finally { Pop-Location }
Push-Location $source
try {
  & node --test 'tests/integration.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Extension integration tests failed.' }
  & node 'tests/core.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Extension core tests failed.' }
  & node 'tests/find-cheaper.test.js'; if ($LASTEXITCODE -ne 0) { throw 'Find This Cheaper tests failed.' }
} finally { Pop-Location }

try {
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
New-Item -ItemType Directory -Path $target -Force | Out-Null

$files = @(
  'manifest.json','popup.html','popup.js','compare.html','compare.js','background.js',
  'auth-receiver.html','auth-receiver.js','privacy.md'
)
$directories = @('icons','styles','shared','detectors','matching','compare','search')
foreach ($file in $files) { Copy-Item -LiteralPath (Join-Path $source $file) -Destination $target }
foreach ($directory in $directories) { Copy-Item -LiteralPath (Join-Path $source $directory) -Destination $target -Recurse }

Remove-Item -LiteralPath (Join-Path $target 'search\demoCatalog.js') -Force
Remove-Item -LiteralPath (Join-Path $target 'matching\matcherTest.js') -Force
$providerPath = Join-Path $target 'search\searchProvider.js'
$provider = Get-Content -LiteralPath $providerPath -Raw
$provider = $provider.Replace('const BACKEND_SEARCH_URL = "http://127.0.0.1:8787/api/search";', 'const BACKEND_SEARCH_URL = ComprRuntimeConfig.apiBaseUrl + "/api/search";')
$provider = $provider.Replace('local-demo-catalog', 'backend').Replace('offline-demo', 'unavailable')
$provider = $provider.Replace('ComprDemoCatalog', 'undefined')
$provider = $provider.Replace('COMPR development backend unavailable; using offline demo', 'COMPR backend unavailable')
Set-Content -LiteralPath $providerPath -Value $provider -Encoding utf8
$comparePath = Join-Path $target 'compare.html'
$compare = Get-Content -LiteralPath $comparePath -Raw
$compare = $compare -replace '\s*<script src="search/demoCatalog\.js"></script>', ''
Set-Content -LiteralPath $comparePath -Value $compare -Encoding utf8

$runtime = @"
// Generated public production configuration. Never add private server secrets here.
const ComprRuntimeConfig = Object.freeze({
  apiBaseUrl: "$($ApiBaseUrl.TrimEnd('/'))",
  supabaseUrl: "$($SupabaseUrl.TrimEnd('/'))",
  supabaseAnonKey: "$SupabaseAnonKey",
  authCallbackUrl: "$AuthCallbackUrl",
  chromeStoreUrl: "$ChromeStoreUrl",
  mode: "production",
  betaMode: true,
  betaAccessUrl: "$websiteBaseUrl/#beta-access",
  platform: "chrome",
  guestMode: false
});
"@
Set-Content -LiteralPath (Join-Path $target 'shared\runtimeConfig.js') -Value $runtime -Encoding utf8

$manifestPath = Join-Path $target 'manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$version = [string]$manifest.version
if ($version -notmatch '^\d+(?:\.\d+){1,3}$') { throw 'Manifest version is not a valid Chrome extension version.' }
$zip = Join-Path $buildRoot "COMPR-v$version-production.zip"
$manifest.host_permissions = @(
  "$($ApiBaseUrl.TrimEnd('/'))/*",
  "$($SupabaseUrl.TrimEnd('/'))/*",
  'https://www.ecb.europa.eu/*'
)
$manifest.web_accessible_resources[0].matches = @((([uri]$AuthCallbackUrl).GetLeftPart('Authority')) + '/*')
$manifest | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $manifestPath -Encoding utf8

if ($manifest.manifest_version -ne 3) { throw 'Production manifest must use Manifest V3.' }
if ($manifest.name -ne 'COMPR') { throw 'Production product name must be COMPR.' }
if ($manifest.content_security_policy.extension_pages -ne "script-src 'self'; object-src 'self'") {
  throw 'Production extension pages must use the self-only Content Security Policy.'
}
if (-not $manifest.permissions -or $manifest.permissions -contains '<all_urls>') { throw 'Production manifest permissions are invalid.' }
if ($manifest.host_permissions | Where-Object { $_ -match 'localhost|127\.0\.0\.1|^http:' }) {
  throw 'Production manifest contains a local or insecure host permission.'
}
if ($manifest.PSObject.Properties.Name -contains 'externally_connectable') {
  throw 'Production manifest must not expose unused external messaging.'
}
if ($manifest.host_permissions -notcontains 'https://www.ecb.europa.eu/*') {
  throw 'Production manifest is missing the ECB host required for currency conversion.'
}
$webResources = @($manifest.web_accessible_resources | ForEach-Object { $_.resources })
if ($webResources.Count -ne 1 -or $webResources[0] -ne 'auth-receiver.html') {
  throw 'Only the login receiver page may be web-accessible.'
}

$required = @(
  'manifest.json','popup.html','popup.js','compare.html','compare.js','background.js','auth-receiver.html','auth-receiver.js','privacy.md',
  'shared\browserAdapter.js','shared\auth.js','shared\apiClient.js','shared\storage.js','shared\reliability.js',
  'matching\productMatcher.js','search\searchProvider.js','search\buildSearchQuery.js'
)
foreach ($requiredFile in $required) {
  if (-not (Test-Path -LiteralPath (Join-Path $target $requiredFile) -PathType Leaf)) {
    throw "Required Week 1-3 production file is missing: $requiredFile"
  }
}
$forbiddenNames = Get-ChildItem -LiteralPath $target -Recurse -File | Where-Object {
  $_.Name -match '(?i)(^\.env|\.test\.js$|test\.js$|readme|audit|checklist)' -or $_.Extension -in @('.zip','.ps1')
}
if ($forbiddenNames) { throw "Non-production files entered the build: $($forbiddenNames.FullName -join ', ')" }

$unsafe = Get-ChildItem -LiteralPath $target -Recurse -File | Select-String -Pattern 'sk_test_|sk_live_|whsec_|service_role|127\.0\.0\.1|localhost|demoCatalog|offline-demo|eval\s*\(|new\s+Function\s*\(' -AllMatches
if ($unsafe) { $unsafe | ForEach-Object { Write-Error "Unsafe production reference: $($_.Path):$($_.LineNumber)" }; throw 'Production validation failed.' }

$inventory = Get-ChildItem -LiteralPath $target -Recurse -File | ForEach-Object {
  $_.FullName.Substring($target.Length + 1).Replace('\','/')
} | Sort-Object
Write-Host "Future release inventory for COMPR v$version ($($inventory.Count) files):" -ForegroundColor Cyan
$inventory | ForEach-Object { Write-Host " - $_" }

if ($ValidationOnly) {
  Write-Host 'Production extension validation-only build passed; no artifact was retained.' -ForegroundColor Green
} elseif ($CreateRelease) {
  if (Test-Path -LiteralPath $zip) { throw "Refusing to overwrite existing versioned artifact: $zip" }
  Compress-Archive -Path (Join-Path $target '*') -DestinationPath $zip -CompressionLevel Optimal
  Write-Host "Production extension validated: $zip" -ForegroundColor Green
}
} finally {
  if ((Test-Path -LiteralPath $target) -and $target.StartsWith($buildRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $target -Recurse -Force
  }
}
