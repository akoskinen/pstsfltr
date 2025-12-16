# Pestes Services - Google Sheets Structure

## Sheet 1: "Services" (Main data)

| service_id | service_name | description | price | primary_categories | yksityinen_tags | taloyhtio_tags | yritys_tags | image_url | cta_text | cta_url |
|------------|--------------|-------------|-------|-------------------|----------------|----------------|-------------|-----------|----------|---------|
| 1 | Rakenteiden Suojaaminen | Jyrsijäsuojaukset, lintuesteet, lintusuojaukset, oravien torjunta | alk. 125,00€ | yksityinen | mokki,kerrostalo,omakotitalo | - | - | https://example.com/image1.jpg | Lue lisää | https://example.com/palvelu/rakenteiden-suojaaminen |
| 2 | Tuholaistorjunta | Luteiden ja Rottien torjunta ammattilaisen avulla on tehokasta ja turvallista | Pyydä tarjous | yksityinen,taloyhtio,yritys | mokki,kerrostalo,omakotitalo | kerrostalo,rivitalo | teollisuus,varasto | https://example.com/image2.jpg | Lue lisää | https://example.com/palvelu/tuholaistorjunta |
| 3 | Tuhoeläin kartoitukset | Kartoitamme kohteesi tuhoelaintilanteen myös ennakoivasti | alk. 200€ | yksityinen,yritys | mokki,omakotitalo | - | toimisto,varasto | https://example.com/image3.jpg | Lue lisää | https://example.com/palvelu/tuhoelain-kartoitukset |
| 5 | Ennaltaehkäisy | Säännölliset tarkastukset ja ennaltaehkäisevät toimenpiteet | Sopimus | taloyhtio,yritys | - | kerrostalo,rivitalo | teollisuus,toimisto | https://example.com/image5.jpg | Ota yhteyttä | https://example.com/palvelu/ennaltaehkaisy |

---

## Sheet 2: "Categories" (Configuration)

| category_type | primary_category | category_id | checkbox_label | display_order |
|---------------|------------------|-------------|----------------|---------------|
| primary | - | yksityinen | Yksityinen | 1 |
| primary | - | taloyhtio | Taloyhtiö | 2 |
| primary | - | yritys | Yritys | 3 |
| secondary | yksityinen | mokki | Mökki | 1 |
| secondary | yksityinen | kerrostalo | Kerrostalo | 2 |
| secondary | yksityinen | omakotitalo | Omakotitalo | 3 |
| secondary | taloyhtio | kerrostalo | Kerrostalo | 1 |
| secondary | taloyhtio | rivitalo | Rivitalo | 2 |
| secondary | yritys | teollisuus | Teollisuus | 1 |
| secondary | yritys | varasto | Varasto | 2 |
| secondary | yritys | toimisto | Toimisto | 3 |

---

## Key Points:

### Services Sheet:
- **service_id**: Unique identifier for each service
- **service_name**: The title displayed on the card
- **description**: The descriptive text shown on the card
- **price**: Display price (can be "alk. 125€", "Pyydä tarjous", "Ilmainen", etc.)
- **primary_categories**: Comma-separated list of which primary tabs this service appears in (yksityinen,taloyhtio,yritys)
- **yksityinen_tags**: Secondary categories for when viewed under "Yksityinen" tab (mokki,kerrostalo,omakotitalo) - use "-" if not in this primary category
- **taloyhtio_tags**: Secondary categories for "Taloyhtiö" tab (kerrostalo,rivitalo) - use "-" if not in this primary category
- **yritys_tags**: Secondary categories for "Yritys" tab (teollisuus,varasto,toimisto) - use "-" if not in this primary category
- **image_url**: URL to the service image
- **cta_text**: Button text ("Lue lisää", "Ota yhteyttä", etc.)
- **cta_url**: Link URL for the button (https://..., /relative-path, etc.)

### Categories Sheet:
- **category_type**: Either "primary" (for segmented control tabs) or "secondary" (for checkboxes)
- **primary_category**: For secondary categories, which primary tab they belong to. Use "-" for primary category rows
- **category_id**: Internal ID used in the Services sheet
- **checkbox_label**: Display text (for primary tabs, this is the tab label; for secondary, the checkbox label)
- **display_order**: Order in which items appear in the UI

---

## Logic Rules:

1. **Service appears in multiple primary tabs**: If primary_categories contains "yksityinen,taloyhtio", the service shows up in both tabs
2. **Different secondary tags per primary category**: The same service can have different filtering options depending on which tab you're viewing it from
   - Example: "Tuholaistorjunta" under "Yksityinen" can be filtered by mokki/kerrostalo/omakotitalo
   - The same service under "Yritys" can be filtered by teollisuus/varasto
3. **Dynamic checkbox sets**: When you switch primary tabs, the checkboxes change to show only the secondary categories relevant to that primary category
4. **Column-based tag lookup**: When filtering, look at the column that matches the current primary category
   - If viewing "Yksityinen" tab, use the yksityinen_tags column
   - If viewing "Taloyhtiö" tab, use the taloyhtio_tags column
5. **No tags = show in all**: If a service has "-" for tags in a particular primary category column, it shows regardless of checkbox selection

---

## Example Filtering Logic:

**Scenario 1**: User selects "Yksityinen" tab
- Shows services #1, #2, #3 (all have "yksityinen" in primary_categories)
- Displays checkboxes: Mökki, Kerrostalo, Omakotitalo
- All three services visible initially

**Scenario 2**: User on "Yksityinen" + checks "Mökki"
- Service #1: Shows (has "mokki" in yksityinen_tags)
- Service #2: Shows (has "mokki" in yksityinen_tags)
- Service #3: Shows (has "mokki" in yksityinen_tags)

**Scenario 3**: User on "Yksityinen" + checks "Mökki" + "Omakotitalo"
- Service #1: Shows (has both "mokki" AND "omakotitalo" in yksityinen_tags)
- Service #2: Shows (has both tags)
- Service #3: Shows (has "omakotitalo" but not "mokki") - **OR logic: shows if it has ANY checked tag**

**Scenario 4**: User switches to "Yritys" tab
- Shows services #2, #3, #5 (all have "yritys" in primary_categories)
- Displays checkboxes: Teollisuus, Varasto, Toimisto
- Notice: Service #2 appears here too, but now uses yritys_tags for filtering

**Scenario 5**: User on "Yritys" + checks "Varasto"
- Service #2: Shows (has "varasto" in yritys_tags)
- Service #3: Shows (has "varasto" in yritys_tags)
- Service #5: Hides (doesn't have "varasto" in yritys_tags)

**Scenario 6**: User selects "Taloyhtiö" tab
- Shows services #2, #5 (have "taloyhtio" in primary_categories)
- Displays checkboxes: Kerrostalo, Rivitalo
- Both services visible initially

---

## Key Insight:

The genius of this structure is that **"Tuholaistorjunta" is ONE service** that intelligently adapts to context:
- For homeowners (Yksityinen): filtered by building type
- For companies (Yritys): filtered by business type
- For housing associations (Taloyhtiö): filtered by building structure

Same service, different lenses based on customer type!

---

## To implement in Google Sheets:

1. Create a new Google Sheet
2. Create two tabs: "Services" and "Categories"
3. Copy the column headers exactly as shown above
4. Fill in your actual service data following this structure
5. Publish the sheet (File → Share → Publish to web → CSV format)
6. Use the published CSV URL in the embed code

---

## Notes for expansion:

- **Adding a service to multiple tabs**: Just list all relevant primary categories (yksityinen,yritys)
- **Different tags per context**: Fill in only the tag columns relevant to each primary category, use "-" for others
- **New secondary category**: Add it to the Categories sheet under the appropriate primary_category
- **New primary category**: Add a primary row to Categories sheet and add a new _tags column to Services sheet
- **Checkbox behavior**: Can be "OR" logic (show if ANY checked tag matches) or "AND" logic (show if ALL checked tags match) - this is determined in the code
- You can add more columns (link_url, featured, active, etc.) without breaking the filtering
