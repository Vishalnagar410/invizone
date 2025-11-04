# frontend/download-rdkit.ps1
Write-Host "📥 Downloading RDKit for Web..." -ForegroundColor Cyan

$rdkitUrl = "https://unpkg.com/rdkit@2022.9.5/Code/MinimalLib/dist/RDKit_minimal.js"
$outputPath = "frontend/public/rdkit/RDKit_minimal.js"

# Create directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "frontend/public/rdkit" | Out-Null

try {
    Invoke-WebRequest -Uri $rdkitUrl -OutFile $outputPath -UseBasicParsing
    Write-Host "✅ RDKit downloaded successfully" -ForegroundColor Green

    $fileSize = (Get-Item $outputPath).Length / 1KB
    Write-Host ("📊 File size: {0} KB" -f [math]::Round($fileSize, 2)) -ForegroundColor Yellow
}
catch {
    Write-Host "❌ Failed to download RDKit: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "🔄 Using placeholder instead" -ForegroundColor Yellow
}
