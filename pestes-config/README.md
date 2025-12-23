# pestes-config

Pieni selainpohjainen työkalu Pestes-palvelusuodattimen konfigurointiin:

- Määritä **pääkategoriat** (tabs)
- Määritä **alakategoriat** jokaiselle pääkategorialle (checkboxes)
- Lisää **palvelut** ja valitse missä pääkategorioissa / alakategorioissa ne näkyvät
- Vie **`Services.csv`** ja **`Categories.csv`** ja tuo ne Google Sheetsiin

## Käyttö

1. Avaa `pestes-config/index.html` selaimessa
2. Lisää/korjaa kategoriat ja palvelut
3. Paina **“Lataa Services.csv”** ja **“Lataa Categories.csv”**
4. Google Sheetsissä:
   - Luo tabit **Services** ja **Categories**
   - Importoi CSV:t vastaaviin taulukoihin

## Tallennus

- Työkalu tallentaa datan automaattisesti selaimen **localStorageen** (vain tällä laitteella/selaimella).
- Suositus: lataa välillä **JSON varmuuskopio**.

## Sarakkeet (Services)

Työkalu generoi sarakkeet:

- `service_id, service_name, description, price, primary_categories, <primary>_tags..., image_url, cta_text, cta_url`

Huom: jokaiselle pääkategorialle syntyy oma `<primary_id>_tags`-sarake (esim. `yksityinen_tags`).


