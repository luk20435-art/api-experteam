param(
  [Parameter(Mandatory = $true)]
  [string]$CommitMessage
)

$ErrorActionPreference = 'Stop'

$branch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq 'main') {
  throw 'Do not commit directly on main. Switch to feature/* branch first.'
}

$status = git status --porcelain
if (-not $status) {
  throw 'No local changes to commit.'
}

Write-Host 'Running backend test/build...'
npm test -- --runInBand
if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }

npm run build
if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }

git add -A
git commit -m $CommitMessage
git push -u origin $branch

Write-Host "Pushed branch '$branch'. Next step: open PR to main." -ForegroundColor Green
