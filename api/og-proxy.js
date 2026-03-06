export default async function handler(req, res) {
  const { slug } = req.query;

  try {
    // Fetch products from the CF Worker
    const response = await fetch('https://djflowerz-worker.ianmuriithiflowerz.workers.dev/api/data/products.json');
    if (!response.ok) {
      throw new Error('Failed to fetch products');
    }

    const products = await response.json();
    const product = Array.isArray(products) ? products.find(p => p.slug === slug || p.id === slug) : null;

    if (!product) {
      return res.status(404).send('Product not found');
    }

    const title = `${product.name} | DJ FLOWERZ`;
    const description = product.shortDescription || (product.description && product.description.substring(0, 160)) || 'Check out this product on DJ FLOWERZ';
    const image = product.image || 'https://djflowerz.co.ke/og-image.jpg';
    const url = `https://djflowerz.co.ke/store/${slug}`;

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        
        <title>${title}</title>
        <meta name="description" content="${description}" />
        
        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website" />
        <meta property="og:url" content="${url}" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="${url}" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />

        <meta http-equiv="refresh" content="0;url=${url}" />
      </head>
      <body>
        <p>Redirecting to <a href="${url}">${title}</a>...</p>
        <script>window.location.href = "${url}";</script>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).send(html);
  } catch (error) {
    console.error('OG Proxy Error:', error);
    // Fallback to basic HTML if R2 fails
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>DJ FLOWERZ</title>
        <meta http-equiv="refresh" content="0;url=https://djflowerz.co.ke/store/${slug}" />
      </head>
      <body>
        <script>window.location.href = "https://djflowerz.co.ke/store/${slug}";</script>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }
}
