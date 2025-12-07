<#
 .SYNOPSIS
    Crea una estructura de frontend básica para consumir el backend DISTRIS_TGS.

 .DESCRIPTION
    Este script de PowerShell genera un sitio web estático dentro de la carpeta
    especificada (por defecto `DISTRIS_TGS_FRONT`). El sitio incluye una página de
    inicio con un formulario de autenticación básico (solo para demostrar la
    navegación) y funciones para sincronizar y listar productos desde los
    endpoints expuestos en el backend de DISTRIS_TGS. También crea un archivo
    de estilos simple para dar algo de formato a la interfaz.

    Para ejecutarlo, abre una terminal de PowerShell y ejecuta:

        ./generate_frontend.ps1 -Root "DISTRIS_TGS_FRONT"

    Si la carpeta no existe, se creará automáticamente. Los archivos que ya
    existan serán sobrescritos.

 .PARAMETER Root
    Nombre de la carpeta donde se generará el frontend. Por defecto es
    `DISTRIS_TGS_FRONT`.

 .EXAMPLE
    PS> ./generate_frontend.ps1

    Crea un frontend en la carpeta `DISTRIS_TGS_FRONT` en el directorio actual.
#>
param(
    [string]$Root = "DISTRIS_TGS_FRONT"
)

# Asegurarnos de que la carpeta exista
if (-not (Test-Path -Path $Root)) {
    New-Item -ItemType Directory -Path $Root | Out-Null
}

# Contenido del archivo HTML principal
$html = @"
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8" />
    <title>DISTRIS TGS Frontend</title>
    <link rel="stylesheet" href="styles.css" />
</head>
<body>
    <div id="login-section">
        <h2>Login</h2>
        <input type="text" id="username" placeholder="Usuario" />
        <input type="password" id="password" placeholder="Contraseña" />
        <button onclick="login()">Iniciar sesión</button>
        <p id="login-message"></p>
    </div>

    <div id="app-section" style="display: none;">
        <h1>Catálogo de Productos</h1>
        <div class="actions">
            <button onclick="syncNewbytes()">Sincronizar NewBytes</button>
            <button onclick="syncGrupoNucleo()">Sincronizar Grupo Núcleo</button>
        </div>
        <section>
            <h3>Productos NewBytes</h3>
            <input type="text" id="search-nb" placeholder="Buscar…" />
            <button onclick="loadNewbytesProducts()">Buscar</button>
            <ul id="newbytes-list"></ul>
        </section>
        <section>
            <h3>Productos Grupo Núcleo</h3>
            <input type="text" id="search-gn" placeholder="Buscar…" />
            <button onclick="loadGrupoNucleoProducts()">Buscar</button>
            <ul id="gruponucleo-list"></ul>
        </section>
    </div>

    <script src="script.js"></script>
</body>
</html>
"@

# Contenido del script JavaScript
$js = @"
// Dirección base del backend. Ajusta si tu API corre en otro host o puerto.
const BASE_URL = 'http://localhost:3000';

// Lógica de autenticación sencilla: oculta o muestra la aplicación.
function login() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();
    const messageEl = document.getElementById('login-message');
    if (!user || !pass) {
        messageEl.textContent = 'Ingrese usuario y contraseña.';
        return;
    }
    // Para esta demo no hay validación contra el backend. Se almacena un flag local.
    localStorage.setItem('isLoggedIn', 'true');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('app-section').style.display = '';
}

// Llama al endpoint de sincronización de NewBytes
async function syncNewbytes() {
    try {
        const res = await fetch(`${BASE_URL}/sync/newbytes`, { method: 'POST' });
        const data = await res.json();
        alert('Sincronización NewBytes finalizada. Registros creados: ' + data.created + ', actualizados: ' + data.updated);
    } catch (err) {
        alert('Error al sincronizar NewBytes: ' + err);
    }
}

// Llama al endpoint de sincronización de Grupo Núcleo
async function syncGrupoNucleo() {
    try {
        const res = await fetch(`${BASE_URL}/sync/gruponucleo`, { method: 'POST' });
        const data = await res.json();
        if (res.ok) {
            alert('Sincronización Grupo Núcleo finalizada. Registros creados: ' + data.created + ', actualizados: ' + data.updated);
        } else {
            // Muestra el mensaje de error devuelto por el backend
            alert('Error al sincronizar Grupo Núcleo: ' + (data.error || '')); 
        }
    } catch (err) {
        alert('Error al sincronizar Grupo Núcleo: ' + err);
    }
}

// Carga productos de NewBytes aplicando filtro si corresponde
async function loadNewbytesProducts() {
    const query = document.getElementById('search-nb').value.trim();
    const listEl = document.getElementById('newbytes-list');
    listEl.innerHTML = '';
    let url = `${BASE_URL}/newbytes-products?limit=50`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        data.forEach(item => {
            const li = document.createElement('li');
            li.textContent = `${item.detalle || ''} - ${item.marca || ''} - ${item.categoria || ''}`;
            listEl.appendChild(li);
        });
    } catch (err) {
        listEl.textContent = 'Error al cargar productos de NewBytes';
    }
}

// Carga productos de Grupo Núcleo aplicando filtro si corresponde
async function loadGrupoNucleoProducts() {
    const query = document.getElementById('search-gn').value.trim();
    const listEl = document.getElementById('gruponucleo-list');
    listEl.innerHTML = '';
    let url = `${BASE_URL}/gruponucleo-products?limit=50`;
    if (query) url += `&q=${encodeURIComponent(query)}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        data.forEach(item => {
            const li = document.createElement('li');
            const desc = item.item_desc_0 || item.item_desc_1 || item.item_desc_2 || item.codigo;
            li.textContent = `${desc || ''} - ${item.marca || ''} - ${item.categoria || ''}`;
            listEl.appendChild(li);
        });
    } catch (err) {
        listEl.textContent = 'Error al cargar productos de Grupo Núcleo';
    }
}
"@

# Contenido del archivo de estilos CSS
$css = @"
body {
    font-family: Arial, Helvetica, sans-serif;
    margin: 20px;
}

#login-section, #app-section {
    max-width: 650px;
    margin: 0 auto;
    padding: 20px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: #fafafa;
}

input {
    display: block;
    margin-bottom: 10px;
    padding: 8px;
    width: 100%;
    box-sizing: border-box;
}

button {
    margin-bottom: 10px;
    padding: 8px 12px;
    cursor: pointer;
}

ul {
    list-style-type: none;
    padding: 0;
}

li {
    padding: 4px 0;
    border-bottom: 1px solid #eee;
}

h1, h2, h3 {
    margin-top: 0;
}

.actions {
    margin-bottom: 20px;
}
"@

# Escribir los archivos en disco
Set-Content -Path (Join-Path $Root 'index.html') -Value $html -Encoding UTF8
Set-Content -Path (Join-Path $Root 'script.js') -Value $js -Encoding UTF8
Set-Content -Path (Join-Path $Root 'styles.css') -Value $css -Encoding UTF8

Write-Host "Frontend generado en la carpeta '$Root'"