param(
  [Parameter(Mandatory = $true)]
  [string]$TagName,
  [string]$Message = 'production release'
)

$ErrorActionPreference = 'Stop'

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') {
  throw 'Release tags must be created from main branch.'
}

$status = git status --porcelain
if ($status) {
  throw 'Working tree is not clean. Commit or stash changes first.'
}

Write-Host 'Running backend test/build on main...'
npm test -- --runInBand
if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }

git pull --ff-only
git tag -a $TagName -m $Message
git push origin $TagName

Write-Host "Release tag '$TagName' pushed. Send tag to server team for deploy." -ForegroundColor Green
