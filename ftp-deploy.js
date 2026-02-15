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

        // Local path
        const localPath = path.join(__dirname, "out")
        const zipFile = "avoska.zip"
        const zipPath = path.join(localPath, zipFile)

        console.log("Creating ZIP archive...")
        try {
            const { execSync } = require('child_process');
            // Create zip of everything inside 'out'
            execSync(`powershell -Command "Set-Location -Path '${localPath}'; Get-ChildItem -Exclude '${zipFile}' | Compress-Archive -DestinationPath '${zipFile}' -Force"`);
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
