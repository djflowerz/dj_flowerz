const BASES = [
    'https://r2.vicknickvideopool.com',
    'https://cdn.vicknickvideopool.com'
];

const EXTENSIONS = ['.mp4', '.mp3', '.m4a', ''];
const TRACK_TITLE = "Indo Ciene Salim Young [ Extended ] [ DJ FLOWERZ VIDEOPOOL ]-1";

async function probe() {
    console.log(`Probing for: "${TRACK_TITLE}"`);

    // Variations of the filename
    const variants = [
        encodeURI(TRACK_TITLE), // encodes spaces as %20 but not special chars like [ ] unless reserved
        encodeURIComponent(TRACK_TITLE), // encodes everything properly
        TRACK_TITLE.replace(/ /g, '%20').replace(/\[/g, '%5B').replace(/\]/g, '%5D'), // manual encoding
        TRACK_TITLE // raw
    ];

    for (const base of BASES) {
        for (const ext of EXTENSIONS) {
            for (const nameVariant of variants) {
                const url = `${base}/${nameVariant}${ext}`;
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 1500);

                    const res = await fetch(url, {
                        method: 'HEAD',
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        console.log(`✅ FOUND: ${url}`);
                        return;
                    }
                } catch (e) {
                    // ignore
                }
            }
        }
    }
    console.log("❌ No match found.");
}

probe();
