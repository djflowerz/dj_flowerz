
# DJ Flowerz - Premium Music Platform

A React-based web application for DJ Flowerz featuring a music pool, merchandise store, booking system, and admin dashboard. Built with React, Tailwind CSS, and Firebase.

## Features

*   **Music Pool**: Subscription-based access to exclusive tracks.
*   **Merch Store**: E-commerce functionality for physical and digital goods.
*   **Bookings**: Request DJ services or studio sessions.
*   **Authentication**: Secure login via Email, Google, and more using Firebase Auth.
*   **Admin Dashboard**: Manage products, users, orders, and content.
*   **Responsive Design**: Mobile-first UI with dark mode aesthetic.

## Setup & Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/dj-flowerz.git
    cd dj-flowerz
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
    *   Fill in your Firebase configuration keys in `.env`.

4.  **Run the application:**
    ```bash
    npm start
    ```

## Firebase Setup

1.  Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2.  Enable **Authentication** (Email/Password, Google).
3.  Create a **Cloud Firestore** database.
4.  Copy the config keys to your `.env` file.
5.  **Seeding Data**:
    *   Log in to the app (create an account).
    *   Manually promote your user to Admin in the Firestore Console (set `role: 'admin'`).
    *   Go to `/admin` -> `System` -> Click "Seed Database" to populate initial content.

## Deployment

This project is ready for **Cloudflare Pages** or **Vercel**.

1.  Push code to GitHub.
2.  Connect your repository to Cloudflare Pages.
3.  Add the Environment Variables from your `.env` to the Cloudflare dashboard.
4.  Build command: `npm run build`.
5.  Output directory: `dist` or `build`.

## Tech Stack

*   React 19
*   TypeScript
*   Tailwind CSS
*   Firebase v12 (Compat)
*   Lucide React (Icons)
*   Recharts (Analytics)
