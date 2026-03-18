$categories = @{
    "transport" = "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=400&auto=format&fit=crop";
    "real-estate" = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=400&auto=format&fit=crop";
    "jobs" = "https://images.unsplash.com/photo-1521737711867-e3b97375f902?q=80&w=400&auto=format&fit=crop";
    "services" = "https://images.unsplash.com/photo-1621905252507-b354bcadcabc?q=80&w=400&auto=format&fit=crop";
    "electronics" = "https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=400&auto=format&fit=crop";
    "home" = "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?q=80&w=400&auto=format&fit=crop";
    "clothing" = "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?q=80&w=400&auto=format&fit=crop";
    "parts" = "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=400&auto=format&fit=crop";
    "hobby" = "https://images.unsplash.com/photo-1502444330042-d1a1ddf9bb5b?q=80&w=400&auto=format&fit=crop";
    "pets" = "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=400&auto=format&fit=crop";
    "beauty" = "https://images.unsplash.com/photo-1596462502278-27bfdc4033c8?q=80&w=400&auto=format&fit=crop";
    "kids" = "https://images.unsplash.com/photo-1515488442805-d37197004f1e?q=80&w=400&auto=format&fit=crop"
}

$destDir = "public/categories"
if (!(Test-Path -Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir
}

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

foreach ($key in $categories.Keys) {
    $url = $categories[$key]
    $file = "$destDir/$key.jpg"
    Write-Host "Downloading $key..."
    try {
        Invoke-WebRequest -Uri $url -OutFile $file -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" -TimeoutSec 30
        Write-Host "Success: $file" -ForegroundColor Green
    } catch {
        Write-Host "Failed: $key - $_" -ForegroundColor Red
    }
    Start-Sleep -Seconds 1
}
Write-Host "Done!"
