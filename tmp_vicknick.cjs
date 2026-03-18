const https = require('https');

https.get('https://r2.vicknickvideopool.com', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        console.log("Total bytes:", data.length);
        
        // Let's look for script tags that might contain the data
        const scriptMatches = data.match(/<script.*?>(.*?)<\/script>/gs);
        if (scriptMatches) {
            console.log(`Found ${scriptMatches.length} script tags`);
            scriptMatches.forEach((script, i) => {
                if (script.includes('window.') || script.includes('const ') || script.length > 500) {
                    console.log(`--- Script ${i} (${script.length} chars) ---`);
                    console.log(script.substring(0, 200) + '...');
                }
            });
        }

        // Let's also look for pre-rendered track elements
        const trackMatches = data.match(/<div[^>]*class="[^"]*track[^"]*"[^>]*>/i);
        if (trackMatches) {
             console.log("Found track div indicators.");
        }
    });
}).on('error', (err) => {
    console.error("Error: ", err.message);
});
