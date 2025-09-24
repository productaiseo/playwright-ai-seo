Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$path = Join-Path -Path (Get-Location) -ChildPath '.env.local'
if (-not (Test-Path -LiteralPath $path)) {
  Write-Output 'No .env.local found; nothing to change.'
  exit 0
}

$content = Get-Content -Raw -LiteralPath $path
$pattern = 'SERVICE_ACCOUNT_JSON=\"\{[\s\S]*?\}\"'
$replacement = '# SERVICE_ACCOUNT_JSON commented out (use GOOGLE_APPLICATION_CREDENTIALS)'
$newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement)

if ($newContent -ne $content) {
  Set-Content -LiteralPath $path -NoNewline -Value $newContent
  Write-Output 'Patched .env.local: commented out SERVICE_ACCOUNT_JSON block.'
} else {
  Write-Output 'Pattern not found or already patched.'
}

