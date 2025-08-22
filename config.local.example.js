// Local development configuration example
// Copy this file to 'config.js' for local development
// DO NOT commit config.js to version control

const CONFIG = {
    // Get your LocationIQ API key from your .env file
    // Replace 'YOUR_LOCATIONIQ_API_KEY_HERE' with your actual API key
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

// Instructions for local development:
// 1. Copy this file and rename it to 'config.js'
// 2. Replace 'YOUR_LOCATIONIQ_API_KEY_HERE' with your actual LocationIQ API key from your .env file
// 3. The config.js file is in .gitignore so it won't be committed to version control
// 4. For GitHub Pages deployment, the API key will be automatically injected from GitHub Secrets
