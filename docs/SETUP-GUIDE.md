# Pestes Services Filter - Setup Guide

## 📦 What You Have

1. **pestes-filter.html** - Complete, working HTML file with embedded demo data
2. **pestes-sheet-structure.md** - Google Sheets structure documentation

## 🚀 Quick Start (Demo Mode)

The HTML file works immediately with demo data:

1. Open `pestes-filter.html` in your browser
2. You'll see 6 example services with full filtering functionality
3. Test all the tabs and checkboxes to see how it works

## 📊 Setting Up Your Google Sheet

### Step 1: Create Your Google Sheet

1. Go to Google Sheets (sheets.google.com)
2. Create a new sheet called "Pestes Services"
3. Create two tabs:
   - **Services** (your service data)
   - **Categories** (your category definitions)

### Step 2: Set Up the Services Tab

Copy these column headers exactly:

```
service_id | service_name | description | price | primary_categories | yksityinen_tags | taloyhtio_tags | yritys_tags | image_url | cta_text | cta_url
```

**Example row:**
```
1 | Tuholaistorjunta | Luteiden ja Rottien torjunta... | Pyydä tarjous | yksityinen,taloyhtio,yritys | mokki,kerrostalo,omakotitalo | kerrostalo,rivitalo | teollisuus,varasto | https://example.com/image.jpg | Lue lisää | https://example.com/palvelu/tuholaistorjunta
```

### Step 3: Set Up the Categories Tab

Copy these column headers exactly:

```
category_type | primary_category | category_id | checkbox_label | display_order
```

**Primary categories (your main tabs):**
```
primary | - | yksityinen | Yksityinen | 1
primary | - | taloyhtio | Taloyhtiö | 2
primary | - | yritys | Yritys | 3
```

**Secondary categories (your checkboxes):**
```
secondary | yksityinen | mokki | Mökki | 1
secondary | yksityinen | kerrostalo | Kerrostalo | 2
secondary | yksityinen | omakotitalo | Omakotitalo | 3
secondary | taloyhtio | kerrostalo | Kerrostalo | 1
secondary | taloyhtio | rivitalo | Rivitalo | 2
secondary | yritys | teollisuus | Teollisuus | 1
secondary | yritys | varasto | Varasto | 2
secondary | yritys | toimisto | Toimisto | 3
```

### Step 4: Publish Your Sheet as CSV

1. In your Google Sheet, click **File → Share → Publish to web**
2. Choose the **Services** tab
3. Select **Comma-separated values (.csv)** format
4. Click **Publish**
5. Copy the URL (it will look like: `https://docs.google.com/spreadsheets/d/e/...`)
6. Repeat for the **Categories** tab

## 🔗 Connecting Google Sheets to Your HTML

### Option A: Using Papa Parse (Recommended)

This is the easiest method for parsing CSV data.

1. Add Papa Parse library to your HTML (before the closing `</body>` tag):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
```

2. Update the CONFIG object in the HTML:

```javascript
const CONFIG = {
    useGoogleSheets: true,
    servicesSheetURL: 'YOUR_SERVICES_CSV_URL_HERE',
    categoriesSheetURL: 'YOUR_CATEGORIES_CSV_URL_HERE',
    // ... rest of config
};
```

3. Replace the `loadFromGoogleSheets()` function with:

```javascript
async function loadFromGoogleSheets() {
    try {
        // Load services
        const servicesData = await new Promise((resolve, reject) => {
            Papa.parse(CONFIG.servicesSheetURL, {
                download: true,
                header: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error)
            });
        });
        
        // Load categories
        const categoriesData = await new Promise((resolve, reject) => {
            Papa.parse(CONFIG.categoriesSheetURL, {
                download: true,
                header: true,
                complete: (results) => resolve(results.data),
                error: (error) => reject(error)
            });
        });
        
        state.services = servicesData.filter(row => row.service_id); // Remove empty rows
        state.categories = categoriesData.filter(row => row.category_id);
        
    } catch (error) {
        console.error('Error loading Google Sheets:', error);
        throw error;
    }
}
```

### Option B: Manual CSV Parsing (No External Library)

If you want to avoid external dependencies, you can parse CSV manually:

```javascript
async function loadFromGoogleSheets() {
    try {
        // Fetch and parse services
        const servicesResponse = await fetch(CONFIG.servicesSheetURL);
        const servicesCSV = await servicesResponse.text();
        state.services = parseCSV(servicesCSV);
        
        // Fetch and parse categories
        const categoriesResponse = await fetch(CONFIG.categoriesSheetURL);
        const categoriesCSV = await categoriesResponse.text();
        state.categories = parseCSV(categoriesCSV);
        
    } catch (error) {
        console.error('Error loading Google Sheets:', error);
        throw error;
    }
}

function parseCSV(csv) {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    
    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            const values = line.split(',').map(v => v.trim());
            const obj = {};
            headers.forEach((header, i) => {
                obj[header] = values[i];
            });
            return obj;
        });
}
```

## 🎨 Embedding on Your Website

### Method 1: Direct Embed (Simplest)

Upload `pestes-filter.html` to your server and embed it using an iframe:

```html
<iframe src="https://yoursite.com/pestes-filter.html" 
        width="100%" 
        height="1200px" 
        frameborder="0"
        style="border: none;">
</iframe>
```

### Method 2: Direct Integration

Copy the entire contents of `pestes-filter.html` and paste it into your website's page template.

### Method 3: Component Integration (For React/Vue/etc)

Extract the JavaScript logic and adapt it to your framework's component structure.

## 🎯 Customization Guide

### Changing Colors

Edit the CSS variables in the `<style>` section:

```css
/* Primary brand color (buttons, CTAs) */
.service-cta { background: #7CB342; } /* Change this */

/* Segmented control active state */
.segment-option.active { background: #2196F3; } /* Change this */

/* Checkbox accent color */
.checkbox-item input[type="checkbox"] { accent-color: #2196F3; } /* Change this */
```

### Changing Grid Layout

The grid automatically adjusts, but you can control the minimum card width:

```css
.services-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    /* Change 280px to your preferred minimum card width */
}
```

### Adding More Fields to Service Cards

1. Add the field to your Google Sheet (e.g., `phone_number`)
2. Update the service card HTML in `renderServices()`:

```javascript
<div class="service-card">
    <!-- existing content -->
    <p class="service-phone">${service.phone_number}</p>
</div>
```

## 🐛 Troubleshooting

### Services Not Loading from Google Sheets

**Problem:** Blank page or loading forever

**Solutions:**
1. Check that your Google Sheet is published to web (not just shared)
2. Verify the CSV URLs are correct
3. Open browser console (F12) to see error messages
4. Make sure column headers match exactly (case-sensitive)

### Filtering Not Working

**Problem:** Clicking categories doesn't filter properly

**Solutions:**
1. Check that `primary_categories` uses comma-separated values (no spaces): `yksityinen,taloyhtio`
2. Verify tag columns use the correct format: `mokki,kerrostalo`
3. Make sure category_id in Categories sheet matches the tags in Services sheet exactly

### Checkboxes Not Appearing

**Problem:** Primary tab selected but no checkboxes show

**Solutions:**
1. Verify you have secondary categories defined for that primary category in the Categories sheet
2. Check that `primary_category` column in Categories sheet matches the `category_id` of the primary

### Images Not Loading

**Problem:** Gray boxes instead of images

**Solutions:**
1. Verify image URLs are complete (include https://)
2. Check that images are publicly accessible
3. Use the provided gradient fallback (already implemented)

## 📱 Mobile Responsiveness

The system is fully responsive:
- **Desktop (>768px)**: 4-column grid
- **Tablet (768px)**: 2-column grid  
- **Mobile (<480px)**: 1-column grid

The segmented control becomes scrollable on mobile to handle many tabs.

## 🔒 Important Notes

### Google Sheets Limitations

- Changes to your Google Sheet may take 2-5 minutes to reflect (due to caching)
- Free Google Sheets API has rate limits (shouldn't be an issue for most sites)
- If you need real-time updates, consider using Google Sheets API with authentication

### Performance

- The current implementation loads all data at once (fine for <100 services)
- For 500+ services, consider implementing pagination or lazy loading
- Images are loaded on-demand by the browser

### Security

- Never put sensitive data in a publicly published Google Sheet
- Consider adding authentication if needed
- The current implementation is read-only (no data can be written back)

## 🎓 Next Steps

1. **Test the demo**: Open `pestes-filter.html` and explore
2. **Create your sheet**: Set up Google Sheets with your actual services
3. **Connect the sheet**: Update the HTML with your CSV URLs
4. **Customize styling**: Adjust colors, fonts, and layout to match your brand
5. **Embed on site**: Choose your embedding method and deploy

## 💡 Pro Tips

- **Batch updates**: Make multiple changes to your Google Sheet before publishing to avoid frequent cache delays
- **Image optimization**: Use properly sized images (400x300px recommended) to improve load times
- **A/B testing**: Keep demo data in place and switch between demo/live with a simple config toggle
- **Analytics**: Add Google Analytics tracking to monitor which services get the most clicks

## 📞 Support

If you run into issues:
1. Check the browser console for error messages (F12)
2. Verify your Google Sheet structure matches the template exactly
3. Test with demo data first to ensure the HTML works
4. Make sure your CSV URLs are from "Publish to web" not "Share" links

---

**Version:** 1.0  
**Last Updated:** December 2024  
**Compatibility:** All modern browsers (Chrome, Firefox, Safari, Edge)
