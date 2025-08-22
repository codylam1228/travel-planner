# 🗺️ Travel Planner

A beautiful, interactive travel planning website that helps you organize your trips day by day with LocationIQ geocoding, OpenStreetMap visualization, and Google Maps navigation.

## ✨ Features

- **Day-by-Day Planning**: Organize your travel itinerary by days
- **Interactive Maps**: OpenStreetMap-based interactive map with Leaflet.js
- **Google Maps Navigation**: Direct links to Google Maps for turn-by-turn navigation
- **Location Management**: Add, edit, and remove locations for each day
- **Smart Geocoding**: Powered by LocationIQ for accurate address-to-coordinate conversion
- **Visual Markers**: Color-coded markers for each day
- **Local Storage**: Your plans are automatically saved locally
- **Export/Import Functionality**: Download your travel plans as JSON and import them back
- **Responsive Design**: Works perfectly on desktop and mobile
- **Modern UI**: Beautiful, intuitive interface

## 🚀 Quick Start

### Prerequisites

1. **LocationIQ API Key**: You need a free LocationIQ API key for geocoding services:
   - Free tier includes 5,000 requests per day
   - No credit card required
   - Enterprise-grade geocoding accuracy

### Setup Instructions

1. **Get LocationIQ API Key**:
   - Go to [LocationIQ](https://locationiq.com/)
   - Sign up for a free account
   - Go to your dashboard and create a new API token
   - Copy your API access token

2. **Configure the API Key**:
   - **For Local Development**: Copy `config.local.example.js` to `config.js` and add your LocationIQ API key
   - **For GitHub Pages**: Add your API key to GitHub Secrets (see deployment section below)

3. **Run the Application**:
   - **Local**: Simply open `index.html` in your web browser
   - **GitHub Pages**: Push to GitHub and enable Pages in repository settings
   - **Local Server**: Use `python -m http.server` or similar for full functionality

## 🌐 GitHub Pages Deployment with LocationIQ API

This application uses GitHub Actions to securely deploy with your LocationIQ API key:

### **Automatic Deployment Setup:**

1. **Add API Key to GitHub Secrets**:
   - Go to your repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `LOCATIONIQ_API_KEY`
   - Value: Your LocationIQ API key

2. **Enable GitHub Pages**:
   - Go to Settings → Pages
   - Source: Select "GitHub Actions"
   - Save settings

3. **Deploy**:
   - Push your code to the `main` branch
   - GitHub Actions will automatically build and deploy your site
   - Your app will be available at `https://yourusername.github.io/repository-name`

**Secure API Key Handling**: Your API key is stored securely in GitHub Secrets and injected during build time, never exposed in your public repository.

### Using a Local Server (Recommended for Development)

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (if you have http-server installed)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## 📱 How to Use

### Creating Your First Trip

1. **Set Travel Dates**: Click on the start and end date fields to set your travel period
2. **Add Days**: Click "Add Day" to create daily plans
3. **Add Locations**: For each day, click "Add Location" to add places to visit
4. **Fill Location Details**: 
   - Enter location name and address
   - Optionally add visit time and notes
   - The system will automatically find coordinates and place markers on the map

### Managing Your Trip

- **View on Map**: All locations appear as color-coded markers on the interactive map
- **Location Details**: Click on markers to see location details and navigation options
- **Edit Locations**: Delete locations using the × button on each location card
- **Reorder Days**: Days are automatically numbered and dated based on your start date
- **Map Navigation**: Use map controls to zoom, pan, and center on your current location

### Advanced Features

- **Center Map**: Use the crosshair button to center the map on your current location
- **Export Plan**: Download your complete travel plan as a JSON file
- **Import Plan**: Load a previously exported travel plan from a JSON file
- **Auto-save**: Your plans are automatically saved to your browser's local storage
- **Clear All**: Reset and start a new trip plan

### Import/Export Functionality

**Exporting Your Plan**:
1. Click the "Export Plan" button in the sidebar
2. Your travel plan will be downloaded as a `travel-plan.json` file
3. This file contains all your days, locations, notes, and trip details

**Importing a Plan**:
1. Click the "Import Plan" button in the sidebar
2. Select a previously exported JSON file
3. The system will validate the file format and import your plan
4. If you have an existing plan, you'll be asked to confirm before replacing it

**JSON Format**: The exported JSON includes:
- Trip title, start date, and end date
- All days with their locations and notes
- Complete location details including coordinates
- Timestamps for notes

This feature is perfect for:
- Backing up your travel plans
- Sharing plans with travel companions
- Moving plans between devices
- Creating templates for similar trips

## 🗂️ File Structure

```
travel-planner/
├── index.html          # Main HTML file
├── styles.css          # CSS styling
├── script.js           # JavaScript functionality
└── README.md           # This file
```

## 🎨 Customization

### Color Themes
You can customize the color scheme by modifying the CSS variables in `styles.css`:

```css
:root {
    --primary-color: #667eea;
    --secondary-color: #764ba2;
    --accent-color: #f093fb;
}
```

### Map Styles
The application uses OpenStreetMap tiles with Leaflet.js for map rendering. You can customize the tile layer in `script.js` if needed.

## 🔧 Troubleshooting

### Common Issues

1. **Map not loading**:
   - Check your LocationIQ API key in config.js
   - Ensure you have a stable internet connection
   - Check browser console for error messages

2. **Geocoding not working**:
   - Verify Geocoding API is enabled
   - Check API quotas and billing

3. **Locations not saving**:
   - Ensure localStorage is enabled in your browser
   - Try clearing browser cache and cookies

### API Quotas

LocationIQ API limits (free tier):
- 5,000 requests per day for geocoding
- No credit card required for free tier
- Generous limits for personal and small business use

## 🔐 Security Notes

- Consider restricting your LocationIQ API key to specific domains in production
- Consider implementing server-side proxy for API calls in production environments
- The current implementation stores data locally - consider adding user authentication for multi-device access

## 🌟 Future Enhancements

Potential features to add:
- User authentication and cloud storage
- Collaborative trip planning
- Integration with booking platforms
- Weather information
- Budget tracking
- Photo attachments
- Social sharing

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and enhancement requests.

---

**Enjoy planning your travels! 🌍✈️** 