const ftp = require("basic-ftp")
const path = require("path")

async function deploy() {
    const client = new ftp.Client()
    client.ftp.verbose = true
    try {
        await client.access({
            host: "konkevlk.beget.tech",
            user: "konkevlk_boss",
            password: "Kk1478963!!!",
            secure: false
        })
        console.log("FTP connected")

        // Paths
        const localPath = path.join(__dirname, "out")
        const zipFile = "avoska.zip"
        const zipPath = path.join(__dirname, zipFile) // ZIP in root

        console.log("Preparing deployment...")

        // Remove old zip if exists
        const fs = require('fs');
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
            console.log("Removed old ZIP archive.")
        }

        console.log("Creating ZIP archive...")
        try {
            const { execSync } = require('child_process');

            // Use tar available on Windows 10+ (bsdtar) which handles / paths correctly
            // -a: auto compress based on .zip extension
            // -c: create
            // -f: file
            // -C: change directory (so we zip relative to 'out')
            // Using '.' to zip current dir content
            execSync(`tar -a -c -f "${zipFile}" -C "${localPath}" .`, { stdio: 'inherit' });

            console.log(`ZIP archive created at ${zipPath}`)
        } catch (zipErr) {
            console.error("ZIP creation failed:", zipErr.message)
            return
        }

        // Remote path
        const remotePath = "/avoska.353290.ru/public_html/" + zipFile

        console.log(`Uploading ${zipPath} to ${remotePath}...`)

        // Upload ONLY the zip file
        await client.uploadFrom(zipPath, remotePath)

        console.log("Archive deployment successful!")

        console.log("Deployment successful!")
    }
    catch (err) {
        console.error("FTP Error:", err)
    }
    client.close()
}

deploy()
