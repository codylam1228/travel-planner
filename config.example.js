// Configuration file template for Travel Planner
// Copy this file to 'config.js' and replace the placeholder values

const CONFIG = {
    // Get your LocationIQ API key from: https://locationiq.com/
    //
    // Steps to get your API key:
    // 1. Go to LocationIQ website: https://locationiq.com/
    // 2. Sign up for a free account or log in to your existing account
    // 3. Go to your dashboard and create a new API token
    // 4. Copy your API access token
    // 5. Replace the placeholder below with your actual API key
    //
    // LocationIQ provides generous free tier limits:
    // - 5,000 requests per day for geocoding
    // - No credit card required for free tier
    LOCATIONIQ_API_KEY: 'YOUR_LOCATIONIQ_API_KEY_HERE',
    
    // Default map center coordinates (New York City)
    DEFAULT_MAP_CENTER: {
        lat: 40.7128,
        lng: -74.0060
    },
    
    // Default zoom level
    DEFAULT_ZOOM: 13
};

// Make config available globally
window.CONFIG = CONFIG;

// Instructions for setup:
// 1. Copy this file and rename it to 'config.js'
// 2. Replace 'YOUR_GOOGLE_MAPS_API_KEY_HERE' with your actual Google Maps API key
// 3. The config.js file is already added to .gitignore so it won't be committed to version control
