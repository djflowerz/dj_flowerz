
/**
 * Client-side wrapper for MailerLite functionality
 * Now calls local API routes to keep API keys secure on the server
 */
export interface SubscriberData {
    email: string;
    fields?: {
        name?: string;
        last_name?: string;
        phone?: string;
        [key: string]: any;
    };
    groups?: string[];
    source?: string;
}

export const MailerLiteService = {
    /**
     * Adds or updates a subscriber via the secure local API
     */
    async subscribe(data: SubscriberData) {
        try {
            const response = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to subscribe');

            return { success: true, data: result };
        } catch (error: any) {
            console.error('Newsletter Subscription Error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Triggers an automation by adding to a group
     */
    async triggerAutomation(email: string, groupId: string, fields?: any) {
        return this.subscribe({
            email,
            fields,
            groups: [groupId]
        });
    },

    /**
     * Creates a campaign via the secure local API (Requires Auth)
     */
    async createCampaign(subject: string, content: string, token: string) {
        try {
            const response = await fetch('/api/newsletter/campaign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    subject,
                    content,
                    name: `Admin Campaign - ${new Date().toLocaleDateString()}`
                }),
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to create campaign');

            return { success: true, data: result.data };
        } catch (error: any) {
            console.error('Campaign Error:', error);
            return { success: false, error: error.message };
        }
    }
};
