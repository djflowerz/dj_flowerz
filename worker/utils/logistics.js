
/**
 * Sendy Fulfillment API Wrapper for Kenya Logistics.
 * Primary Endpoint: https://fulfillment-api.sendyit.com/v1
 */

export class SendyClient {
    constructor(env) {
        this.apiKey = env.SENDY_API_KEY;
        this.username = env.SENDY_USERNAME;
        this.baseUrl = env.SENDY_ENV === 'production' 
            ? 'https://fulfillment-api.sendyit.com/v1' 
            : 'https://fulfillment-api-test.sendyit.com/v1';
    }

    async request(endpoint, method = 'POST', body = null) {
        if (!this.apiKey || !this.username) {
            console.error('[Sendy] Missing API credentials');
            throw new Error('Logistics provider not configured');
        }

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'api-key': this.apiKey,
                'username': this.username
            },
            body: body ? JSON.stringify(body) : null
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(`Sendy Error: ${error.message || 'Unknown error'}`);
        }

        return await res.json();
    }

    /**
     * Gets a shipping quote between two points.
     */
    async getQuote(deliveryDetails) {
        return await this.request('/delivery/quote', 'POST', {
            pickup_location: {
                description: "DJ Flowerz Warehouse, Nairobi",
                latitude: -1.286389,
                longitude: 36.817223
            },
            delivery_location: deliveryDetails.location,
            package_type: "small_package"
        });
    }

    /**
     * Books a delivery.
     */
    async createOrder(orderData) {
        return await this.request('/delivery/order', 'POST', {
            sender_details: {
                name: "DJ Flowerz Fulfillment",
                phone: "254700000000"
            },
            recipient_details: orderData.recipient,
            delivery_details: orderData.delivery,
            package_details: orderData.package
        });
    }
}
