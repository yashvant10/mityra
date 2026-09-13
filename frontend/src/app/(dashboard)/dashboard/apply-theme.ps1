$files = @(
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\dashboard\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\wardrobe\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\pricing\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\profile\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\settings\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\saved-outfits\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\tryon-history\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\recommendations\page.tsx',
  'c:\Users\YASHVANT\Downloads\update-all-in-fashion-APP-main\frontend\src\app\(dashboard)\stylist\page.tsx'
)

foreach ($f in $files) {
  if (Test-Path $f) {
    $content = [System.IO.File]::ReadAllText($f)
    
    # Color token replacements (order matters: longest first)
    $content = $content -replace 'neon-purple-light', 'emerald-light'
    $content = $content -replace 'neon-purple-dark', 'emerald-dark'
    $content = $content -replace 'neon-purple', 'emerald'
    $content = $content -replace 'electric-cyan', 'gold-light'
    $content = $content -replace 'electric-blue', 'gold'
    $content = $content -replace 'space-black', 'matte-black'
    $content = $content -replace 'space-dark', 'matte-dark'
    $content = $content -replace 'space-gray', 'matte-gray'
    
    # Hex color replacements
    $content = $content -replace '#A855F7', '#2D6A4F'
    $content = $content -replace '#C084FC', '#40916C'
    $content = $content -replace '#7C3AED', '#1B4332'
    $content = $content -replace '#3B82F6', '#C9A96E'
    $content = $content -replace '#06B6D4', '#D4B983'
    $content = $content -replace '#10B981', '#4E937A'
    $content = $content -replace '#b026ff', '#2D6A4F'
    
    # Background hex
    $content = $content -replace 'bg-\[#050510\]', 'bg-[#141414]'
    $content = $content -replace 'bg-\[#0A0A1A\]', 'bg-[#1A1A1A]'
    $content = $content -replace 'bg-\[#0a0a1a\]', 'bg-[#1A1A1A]'
    $content = $content -replace 'bg-\[#111127\]', 'bg-[#222222]'
    $content = $content -replace 'bg-\[#080816\]', 'bg-[#1A1A1A]'
    $content = $content -replace 'bg-\[#080814\]', 'bg-[#1A1A1A]'
    $content = $content -replace 'bg-\[#0a0a0f\]', 'bg-[#1A1A1A]'
    $content = $content -replace 'bg-\[#0b0b14\]', 'bg-[#1A1A1A]'
    $content = $content -replace 'bg-\[#0c0c16\]', 'bg-[#1A1A1A]'
    
    # Border opacity
    $content = $content -replace 'border-white/5', 'border-white/[0.04]'
    $content = $content -replace 'border-white/10', 'border-white/[0.06]'
    
    # Gradient replacements
    $content = $content -replace 'from-violet-600/10', 'from-emerald-800/10'
    $content = $content -replace 'via-fuchsia-600/5', 'via-emerald-700/5'
    $content = $content -replace 'via-purple-500/50', 'via-emerald-600/50'
    $content = $content -replace 'from-purple-600 to-pink-500', 'from-emerald-700 to-gold'
    $content = $content -replace 'from-purple-600 to-blue-600', 'from-emerald-700 to-gold'
    $content = $content -replace 'from-purple-600 via-fuchsia-600 to-pink-500', 'from-emerald-800 via-emerald-700 to-gold'
    $content = $content -replace 'from-purple-500/20 to-pink-500/20', 'from-emerald-600/20 to-gold/20'
    $content = $content -replace 'from-purple-500/20 to-indigo-500/10', 'from-emerald-600/20 to-gold/10'
    $content = $content -replace 'from-purple-500/35 hover:to-indigo-500/25', 'from-emerald-600/35 hover:to-gold/25'
    $content = $content -replace 'from-blue-600 to-indigo-600', 'from-gold to-amber-700'
    $content = $content -replace 'from-blue-500 hover:to-indigo-500', 'from-gold hover:to-amber-600'
    $content = $content -replace 'from-blue-500/10', 'from-gold/10'
    $content = $content -replace 'via-indigo-500/10', 'via-gold/10'
    $content = $content -replace 'from-blue-500 to-purple-500', 'from-emerald-600 to-gold'
    
    # Purple classes
    $content = $content -replace 'bg-purple-600/10', 'bg-emerald-700/10'
    $content = $content -replace 'text-purple-300', 'text-emerald-300'
    $content = $content -replace 'text-purple-400', 'text-emerald-400'
    $content = $content -replace 'text-purple-500', 'text-emerald-500'
    $content = $content -replace 'bg-purple-500/10', 'bg-emerald-600/10'
    $content = $content -replace 'bg-purple-500/20', 'bg-emerald-600/20'
    $content = $content -replace 'border-purple-500/20', 'border-emerald-600/20'
    $content = $content -replace 'border-purple-500/30', 'border-emerald-600/30'
    $content = $content -replace 'border-purple-500/40', 'border-emerald-600/40'
    $content = $content -replace 'hover:border-purple-500/20', 'hover:border-emerald-600/20'
    $content = $content -replace 'hover:border-purple-500/40', 'hover:border-emerald-600/40'
    
    # Fuchsia to gold
    $content = $content -replace 'text-fuchsia-500', 'text-gold'
    $content = $content -replace 'text-fuchsia-400', 'text-gold'
    $content = $content -replace 'fill-fuchsia-500/20', 'fill-gold/20'
    $content = $content -replace 'fill-fuchsia-500', 'fill-gold'
    $content = $content -replace 'hover:text-fuchsia-400', 'hover:text-gold'
    $content = $content -replace 'border-fuchsia-500/20', 'border-gold/20'
    $content = $content -replace 'border-fuchsia-500/30', 'border-gold/30'
    
    # Shadow replacements
    $content = $content -replace 'shadow-\[0_0_60px_-15px_rgba\(168,85,247,0\.2\)\]', 'shadow-[0_0_60px_-15px_rgba(45,106,79,0.2)]'
    $content = $content -replace 'shadow-\[0_4px_30px_rgba\(168,85,247,0\.35\)\]', 'shadow-[0_4px_30px_rgba(45,106,79,0.35)]'
    $content = $content -replace 'shadow-neon-glow', 'shadow-emerald-glow'
    $content = $content -replace 'shadow-purple-500/20', 'shadow-emerald-600/20'
    
    # Neon glow
    $content = $content -replace 'neon-glow', 'emerald-glow'
    
    # Purple gradient text
    $content = $content -replace 'text-purple-700', 'text-emerald-800'
    
    # Blue individual classes
    $content = $content -replace 'text-blue-300', 'text-gold'
    $content = $content -replace 'text-blue-400', 'text-gold'
    $content = $content -replace 'bg-blue-500/20', 'bg-gold/20'
    $content = $content -replace 'bg-blue-500/10', 'bg-gold/10'
    $content = $content -replace 'border-blue-500/30', 'border-gold/30'
    $content = $content -replace 'border-blue-500/20', 'border-gold/20'
    
    # Indigo -> gold
    $content = $content -replace 'text-indigo-400', 'text-gold'
    
    # Pink -> rose
    $content = $content -replace 'text-pink-300', 'text-rose-300'
    $content = $content -replace 'bg-pink-500/20', 'bg-rose-400/20'
    $content = $content -replace 'text-pink-400', 'text-rose-400'
    
    [System.IO.File]::WriteAllText($f, $content)
    Write-Host "Updated: $f"
  } else {
    Write-Host "NOT FOUND: $f"
  }
}
Write-Host 'All files processed!'
