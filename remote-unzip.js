const ftp = require("basic-ftp");
const path = require("path");
const http = require("http");

const CONFIG = {
    ftp: {
        host: "konkevlk.beget.tech",
        user: "konkevlk_boss",
        password: process.env.FTP_PASSWORD || "Kk1478963!!!",
        secure: false
    },
    remotePath: "/avoska.353290.ru/public_html/",
    siteUrl: "http://avoska.353290.ru",
    phpScript: "_unzip.php",
    zipFile: "avoska.zip"
};

async function run() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access(CONFIG.ftp);

        // 1. Create PHP script
        const fs = require('fs');
        const phpContent = `<?php
        $file = '${CONFIG.zipFile}';
        set_time_limit(300);
        if (!file_exists($file)) { die("Error: $file not found"); }
        $zip = new ZipArchive;
        if ($zip->open($file) === TRUE) {
            $zip->extractTo(__DIR__);
            $zip->close();
            unlink($file);
            echo "Success";
        } else {
            echo "Error: cannot open zip";
        }
        unlink(__FILE__);
        ?>`;

        const localPhpPath = path.join(__dirname, CONFIG.phpScript);
        fs.writeFileSync(localPhpPath, phpContent);

        // 2. Upload script
        console.log("📤 Uploading extraction script...");
        await client.uploadFrom(localPhpPath, CONFIG.remotePath + CONFIG.phpScript);

        // 3. Trigger extraction
        console.log(`🌐 Triggering extraction at ${CONFIG.siteUrl}/${CONFIG.phpScript}...`);
        await new Promise(r => {
            http.get(`${CONFIG.siteUrl}/${CONFIG.phpScript}`, res => {
                let d = '';
                res.on('data', c => d += c);
                res.on('end', () => {
                    console.log("📥 Server Response:", d);
                    if (d.includes("Success")) {
                        console.log("🚀 Extraction successful!");
                    } else {
                        console.log("❌ Extraction failed or returned unexpected result.");
                    }
                    r();
                });
            }).on('error', e => {
                console.error("❌ HTTP Error:", e.message);
                r();
            });
        });

        // Cleanup local script
        if (fs.existsSync(localPhpPath)) fs.unlinkSync(localPhpPath);

    } catch (e) {
        console.error("❌ FTP Error:", e);
    } finally {
        client.close();
    }
}

run();
