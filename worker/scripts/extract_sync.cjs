const fs = require('fs');

async function sync() {
    try {
        const profilesRaw = fs.readFileSync('profiles_raw.json', 'utf8');
        const profilesData = JSON.parse(profilesRaw);
        const profiles = profilesData[0].results;
        fs.writeFileSync('profiles.json', JSON.stringify(profiles, null, 2));
        console.log(`Extracted ${profiles.length} profiles.`);

        const subsRaw = fs.readFileSync('subs_raw.json', 'utf8');
        const subsData = JSON.parse(subsRaw);
        const subs = subsData[0].results;
        fs.writeFileSync('subscriptions.json', JSON.stringify(subs, null, 2));
        console.log(`Extracted ${subs.length} subscriptions.`);
    } catch (e) {
        console.error("Sync extraction failed:", e);
        process.exit(1);
    }
}

sync();
