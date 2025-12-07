$base = "frontend"

Write-Host "Creando estructura del nuevo FRONT profesional TGS..."

New-Item -ItemType Directory -Path $base -Force

New-Item -ItemType Directory -Path "$base\assets\css" -Force
New-Item -ItemType Directory -Path "$base\assets\js\modules" -Force

# HTML principal
New-Item -ItemType File -Path "$base\index.html" -Force

# CSS
New-Item -ItemType File -Path "$base\assets\css\main.css" -Force
New-Item -ItemType File -Path "$base\assets\css\layout.css" -Force
New-Item -ItemType File -Path "$base\assets\css\theme.css" -Force

# JS base
New-Item -ItemType File -Path "$base\assets\js\app.js" -Force
New-Item -ItemType File -Path "$base\assets\js\api.js" -Force
New-Item -ItemType File -Path "$base\assets\js\auth.js" -Force
New-Item -ItemType File -Path "$base\assets\js\ui.js" -Force
New-Item -ItemType File -Path "$base\assets\js\config.js" -Force

# Módulos
New-Item -ItemType File -Path "$base\assets\js\modules\globalSearch.js" -Force
New-Item -ItemType File -Path "$base\assets\js\modules\tgs.js" -Force
New-Item -ItemType File -Path "$base\assets\js\modules\elit.js" -Force
New-Item -ItemType File -Path "$base\assets\js\modules\newbytes.js" -Force
New-Item -ItemType File -Path "$base\assets\js\modules\gruponucleo.js" -Force
New-Item -ItemType File -Path "$base\assets\js\modules\users.js" -Force

Write-Host "FRONT profesional creado con éxito."
