const ftp = require("basic-ftp");

const CONFIG = {
    ftp: {
        host: "konkevlk.beget.tech",
        user: "konkevlk_boss",
        password: "Kk1478963!!!",
        secure: false
    },
    remotePath: "/avoska.353290.ru/public_html/"
};

async function clean() {
    const client = new ftp.Client();
    client.ftp.verbose = true;
    try {
        await client.access(CONFIG.ftp);
        console.log("🧹 Cleaning remote directory...");

        await client.ensureDir(CONFIG.remotePath);
        await client.clearWorkingDir();

        console.log("✅ Remote directory cleaned.");
    } catch (err) {
        console.error("❌ Clean Error:", err);
    } finally {
        client.close();
    }
}

clean();
