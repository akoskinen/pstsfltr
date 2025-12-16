# Quick Reference Card - Pestes Filter System

## 📋 Common Tasks

### Adding a New Service

**In Google Sheets (Services tab):**

1. Add new row with unique service_id
2. Fill in service_name, description, price
3. Set primary_categories (comma-separated): `yksityinen,taloyhtio`
4. For each primary category, fill the corresponding tags column:
   - `yksityinen_tags`: `mokki,kerrostalo` or `-`
   - `taloyhtio_tags`: `kerrostalo,rivitalo` or `-`
   - `yritys_tags`: `teollisuus,varasto` or `-`
5. Add image_url, cta_text, and cta_url

**Example:**
```
7,Kosteudenhallinta,Kosteusvaurioiden ennaltaehkäisy ja korjaus,alk. 300€,yksityinen,taloyhtio,mokki,omakotitalo,kerrostalo,rivitalo,-,-,https://...,Lue lisää
```

---

### Adding a New Primary Category

**In Google Sheets (Categories tab):**

1. Add primary category row:
   ```
   primary,-,asuntokauppa,Asuntokauppa,5
   ```

2. Add its secondary categories:
   ```
   secondary,asuntokauppa,tarkastus,Tarkastus,1
   secondary,asuntokauppa,todistus,Todistus,2
   ```

3. **In Services tab**: Add new column `asuntokauppa_tags`

4. **In HTML file**: Update CONFIG if hardcoded, or it will auto-load from sheet

---

### Adding a New Secondary Category

**In Google Sheets (Categories tab):**

1. Add row under the appropriate primary:
   ```
   secondary,yksityinen,paritalo,Paritalo,4
   ```

2. Services will now be able to use `paritalo` as a tag in `yksityinen_tags` column

---

### Making a Service Appear in Multiple Tabs

**In Services sheet**, set primary_categories to include both:
```
primary_categories: yksityinen,yritys
```

Then fill in tags for both contexts:
```
yksityinen_tags: mokki,omakotitalo
yritys_tags: toimisto,varasto
```

---

### Hiding a Service Temporarily

**Option 1**: Remove all values from `primary_categories`
**Option 2**: Add an `active` column and filter in code
**Option 3**: Delete the row (but keep a backup!)

---

### Changing Tab Order

**In Categories sheet**, modify the `display_order` values:
```
primary,-,yksityinen,Yksityinen,1
primary,-,taloyhtio,Taloyhtiö,2
primary,-,yritys,Yritys,3
```

---

### Changing Checkbox Order

Same as tab order - modify `display_order` in Categories sheet:
```
secondary,yksityinen,omakotitalo,Omakotitalo,1  (moves to first)
secondary,yksityinen,mokki,Mökki,2
secondary,yksityinen,kerrostalo,Kerrostalo,3
```

---

## 🎨 Style Quick Changes

### Change Brand Color

Find and replace in CSS:
- `#7CB342` → Your brand green
- `#2196F3` → Your brand blue

### Change Grid Columns

```css
.services-grid {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    /* Change 280px to 350px for 3 columns instead of 4 */
}
```

---
## 🔍 Debugging Checklist

### Service Not Showing Up?

- [ ] Check `primary_categories` includes the current tab
- [ ] If checkboxes selected, verify the service has matching tags
- [ ] Confirm service_id is unique and not empty
- [ ] Check for typos in category names (case-sensitive!)

### Checkboxes Not Appearing?

- [ ] Verify Categories sheet has secondary entries for this primary
- [ ] Check `primary_category` matches the tab's `category_id` exactly
- [ ] Confirm `category_type` is set to "secondary"

### Styling Issues?

- [ ] Clear browser cache (Ctrl+F5)
- [ ] Check browser console for CSS errors
- [ ] Verify no conflicting styles from parent site

### Google Sheets Not Updating?

- [ ] Wait 2-5 minutes for cache to clear
- [ ] Verify sheet is published (not just shared)
- [ ] Check the CSV URL is from "Publish to web"
- [ ] Try opening CSV URL directly in browser to see raw data

---

## 📊 Data Format Rules

### Primary Categories
```
Format: comma-separated, no spaces
Correct: yksityinen,taloyhtio,yritys
Wrong: yksityinen, taloyhtio, yritys
Wrong: yksityinen taloyhtio yritys
```

### Secondary Tags
```
Format: comma-separated, no spaces
Correct: mokki,kerrostalo,omakotitalo
Wrong: mokki, kerrostalo, omakotitalo
Use "-" for none: -
```

### Category IDs
```
Format: lowercase, no spaces, no special characters
Correct: yksityinen, taloyhtio, mokki, kerrostalo
Wrong: Yksityinen, Taloyhtio, Mökki, Kerrostalo
Wrong: yksi tyinen, talo-yhtiö
```

### Display Labels
```
Format: Any text, can include spaces and special characters
Correct: Yksityinen, Taloyhtiö, Mökki
Correct: Asunto & Kiinteistö
```

---

## 🚀 Performance Tips

### For 100+ Services
- Optimize images (WebP format, max 400x300px)
- Consider lazy loading images
- Add pagination (show 20 at a time)

### For Slow Loading
- Enable browser caching
- Minimize image sizes
- Consider CDN for images
- Use compressed images

### For Better SEO
- Add alt text to all images
- Include proper heading structure
- Add meta descriptions
- Make CTA buttons proper links

---

## 🔐 Security Reminders

- ✅ Google Sheets published to web are PUBLIC
- ❌ Never put personal data (emails, phones, addresses)
- ❌ Never put API keys or passwords
- ✅ Use generic service descriptions only
- ✅ Host images on public CDN or your server

---

## 📞 Testing Checklist

Before going live:

- [ ] Test on Chrome, Firefox, Safari
- [ ] Test on mobile phone (portrait & landscape)
- [ ] Test on tablet
- [ ] Click every tab
- [ ] Check every checkbox combination
- [ ] Verify all service cards display correctly
- [ ] Test all CTA buttons link to correct pages
- [ ] Verify images load (or show gradient fallback)
- [ ] Check spelling in all content
- [ ] Confirm Google Sheets loads (not demo data)
- [ ] Test with slow internet connection

---

## 💡 Pro Tips

1. **Naming Convention**: Keep category_ids short and descriptive: `mokki` not `mokki_category_2024`

2. **Tag Strategy**: Use broad tags for better discoverability. `kerrostalo` is better than `kerrostalo_3-10_kerrosta`

3. **Content Strategy**: Keep descriptions under 150 characters for best card layout

4. **Image Strategy**: Use consistent image style (all photos OR all illustrations, not mixed)

5. **Testing**: Always test with demo data first, then switch to live data

6. **Updates**: Batch your Google Sheet changes to avoid cache delays

7. **Backup**: Keep a copy of your Google Sheet as backup before major changes

---

**Need Help?** Check the full SETUP-GUIDE.md for detailed explanations.
