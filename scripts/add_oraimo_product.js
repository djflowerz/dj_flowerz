import fetch from 'node-fetch';

const productData = {
    name: "oraimo PowerTrans USB-C Hub 7-in-1 Multi-Functional Adapter Docking Station",
    slug: "oraimo-powertrans-usb-c-hub-7-in-1",
    brand: "oraimo",
    type: "physical",
    description: `Product Parameters：
Input: USB-C
Output: USB-A*2, video transmission port*1, PD*1, Type-C*1, SD*1, TF*1
USB Interface Standard: USB3.2
PD Interface Standard: PD3.0
Video Transmission: maximum resolution 4K@60Hz, compatible with 1080P@60Hz, 720P@60Hz, 480P@60Hz, and more
Type-C Interface Standard: 5Gbps (maximum theoretical value)
SD/TF Interface Standard: Compliant with SD/TF card protocol standard (USB2.0)
Compatible with: Windows/macOS/Linux system
Material: Aluminum alloy
Product Size: 129.5(L)*32(W)*11(H) mm
Model: OUH-511`,
    category_id: "electronics", // Defaulting to electronics or similar if exists
    is_active: true,
    release_date: "2026-03-10",
    image_url: "https://cdn-img.oraimo.com/fit-in/600x600/KE/product/2025/02/12/OUH-511.png",
    variants: [
        {
            name: "Default",
            sku: "OUH-511",
            price: 2500,
            compare_at_price: 3000,
            stock_quantity: 10,
            weight: 0.1, // Placeholder since N/A provided
            image_url: "https://cdn-img.oraimo.com/fit-in/600x600/KE/product/2025/02/12/OUH-511.png"
        }
    ],
    metadata: {
        dimensions: "129.5(L)*32(W)*11(H) mm",
        model: "OUH-511",
        material: "Aluminum alloy"
    }
};

async function addProduct() {
    const response = await fetch('https://djflowerz-worker.ianmuriithiflowerz.workers.dev/api/admin/products', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer admin_token_placeholder' // We might need a real token or bypass in local
        },
        body: JSON.stringify(productData)
    });

    const result = await response.json();
    console.log(JSON.stringify(result, null, 2));
}

addProduct();
