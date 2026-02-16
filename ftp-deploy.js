const ftp = require("basic-ftp");
const path = require("path");
const fs = require("fs");
const { execSync } = require("child_process");

const CONFIG = {
    ftp: {
        host: "konkevlk.beget.tech",
        user: "konkevlk_boss",
        password: "Kk1478963!!!",
        secure: false
    },
    localBuildDir: "out",
    zipFileName: "avoska.zip",
    remotePath: "/avoska.353290.ru/public_html/"
};

async function deploy() {
    const client = new ftp.Client();
    client.ftp.verbose = true;

    const localPath = path.join(__dirname, CONFIG.localBuildDir);
    const zipPath = path.join(__dirname, CONFIG.zipFileName);

    try {
        await client.access(CONFIG.ftp);
        console.log("✅ FTP connected");

        // 1. Create ZIP
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        console.log("📦 Creating ZIP...");
        execSync(`tar -a -c -f "${CONFIG.zipFileName}" -C "${localPath}" .`, { stdio: 'inherit' });

        // 2. Upload
        const remoteFull = CONFIG.remotePath + CONFIG.zipFileName;
        console.log(`📤 Uploading zip to ${remoteFull}...`);
        await client.uploadFrom(zipPath, remoteFull);
        console.log("✅ Upload complete");

    } catch (err) {
        console.error("❌ FTP Error:", err);
    } finally {
        client.close();
    }
}

deploy();
