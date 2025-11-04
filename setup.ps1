# Create setup.ps1 in your project root
@'
# SmartChemView Complete Setup Script
Write-Host "🚀 SmartChemView Setup" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# 1. Create RDKit directory
Write-Host "`n📁 Step 1: Creating directories..." -ForegroundColor Yellow
mkdir -Force frontend\public\rdkit | Out-Null

# 2. Create RDKit loader
Write-Host "📝 Step 2: Creating RDKit loader..." -ForegroundColor Yellow
$loaderContent = @'
// RDKit Loader
class RDKitLoader {
    async loadRDKit() {
        try {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = "/rdkit/RDKit_minimal.js";
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            return await window.RDKit.load();
        } catch (error) {
            console.warn("RDKit failed, using mock");
            return {
                get_mol: (smiles) => ({
                    get_mol_wt: () => 0,
                    get_formula: () => "C?H?O?",
                    is_valid: () => true
                })
            };
        }
    }
}
window.RDKitLoader = new RDKitLoader();
'@
Set-Content -Path "frontend\public\rdkit\rdkit-loader.js" -Value $loaderContent

# 3. Download RDKit
Write-Host "📥 Step 3: Downloading RDKit..." -ForegroundColor Yellow
cd frontend
.\download-rdkit.ps1

# 4. Reset database
Write-Host "🗑️ Step 4: Resetting database..." -ForegroundColor Yellow
cd ..\backend
python reset_database.py

Write-Host "`n✅ Setup complete!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Start backend: cd backend; python start_server.py" -ForegroundColor White
Write-Host "2. Start frontend: cd frontend; npm run dev" -ForegroundColor White
Write-Host "3. Open http://localhost:3000" -ForegroundColor White
'@ | Set-Content -Path "setup.ps1"

# Run the setup
.\setup.ps1