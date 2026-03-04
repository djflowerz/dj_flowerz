
# DJ Flowerz - Premium Music Platform

A React-based web application for DJ Flowerz featuring a music pool, merchandise store, booking system, and admin dashboard. Built with React, Tailwind CSS, Supabase, and Cloudflare R2.

## Features

*   **Music Pool**: Subscription-based access to exclusive tracks, served via Cloudflare R2.
*   **Merch Store**: E-commerce functionality for physical and digital goods with Paystack integration.
*   **Bookings**: Request DJ services or studio sessions.
*   **Authentication**: Secure login via Email, Google, and more using Supabase Auth.
*   **Email System**: Cloudflare Email Routing with Gmail SMTP for high-deliverability notifications.
*   **Admin Dashboard**: Manage products, users, orders, newsletters, and more.
*   **Responsive Design**: Premium dark mode aesthetic with smooth animations.

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/djflowerz/dj_flowerz.git
    cd dj_flowerz
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Configuration:**
    *   Copy `.env.example` to `.env`:
        ```bash
        cp .env.example .env
        ```
    *   Fill in your configuration keys for Supabase, Cloudflare R2, and Gmail SMTP.

4.  **Run the application:**
    ```bash
    npm start
    ```

## Storage & Email Setup

### Cloudflare R2
1.  Create an R2 bucket in your Cloudflare dashboard.
2.  Enable CORS for your domain.
3.  Bind the bucket to a Cloudflare Worker for serving assets securely.

### Email Routing
1.  Configure Cloudflare Email Routing for your domain `djflowerz.co.ke`.
2.  Set up forwarding addresses (bookings@, admin@, promo@, receipts@, noreply@) to your primary Gmail.
3.  Configure Nodemailer in the backend to use your Gmail App Password for sending.

## Deployment

This project is optimized for deployment on **Vercel** with a **Cloudflare Worker** backend.

1.  Push code to GitHub.
2.  Connect your repository to Vercel.
3.  Deploy the Cloudflare Worker using `npx wrangler deploy`.
4.  Run `update_vercel_env.sh` to sync your local environment variables with Vercel Production.

## Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **Auth & Meta-Database**: Supabase
*   **Storage**: Cloudflare R2 (Buckets)
*   **Serverless**: Cloudflare Workers & Vercel Edge Functions
*   **Payments**: Paystack
*   **Email**: Cloudflare Routing + Gmail SMTP (Nodemailer)
*   **Icons**: Lucide React
*   **Analytics**: Recharts
