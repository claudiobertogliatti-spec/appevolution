# Connector MCP Systeme — mappa verificata (17/9/2026)

Fonti: descrizioni ufficiali dei tool, `describe_page_edit_guide`, lettura reale di una pagina squeeze del Template Master.

## Due flussi — non confonderli

| Flusso | Tool | Effetto |
|---|---|---|
| Crea/ricrea | `describe_page_template` → `save_page_content_from_template` | Layout, blocchi, spacing e tipografia fissi; sostituisce tutto il contenuto. VIETATO su pagine esistenti. |
| Modifica | `get_page_editable_content` → `update_page_content` | Modifica in place. Unico flusso ammesso. |

## Protocollo di modifica

1. `get_page_editable_content` sempre per primo. Entità in ordine DFS; `position` = indice nei `childIds` del parent.
2. Azioni: `update_entity`, `add_library_element`, `remove_node`.
3. Dopo ogni `add_library_element` serve una seconda chiamata `update_entity` sui nuovi id. Mai lasciare i default.
4. Mai riusare nella stessa chiamata id creati o rimossi nello stesso array.
5. Proprietà annidate patchabili con lo stesso percorso.
6. Array (`subEntities`, `menuItems`) si sostituiscono interi; i campi omessi vengono cancellati.
7. Mai `remove_node` su Body o Popup.

## Proprietà viste

| Tipo | Proprietà |
|---|---|
| Section | margin, mobileMargin, padding, backgroundColor, containerBackgroundColor |
| Row | margin, mobileMargin, padding, backgroundColor |
| Column | size (1–12) |
| Text | content (HTML: strong, em, a, span style color), fontSize, mobileFontSize, lineHeight, mobileLineHeight, margin, mobileMargin, padding, backgroundColor |
| Button | text, subText, textFontSize, mobileTextFontSize, subTextFontSize, mobileSubTextFontSize, border {width, style, radius, type, color}, mobileBorder, padding, textColor, mobileTextColor, subTextColor, background, mobileBackground, margin, mobileMargin |
| Field | fontSize, color, backgroundColor, padding, border, placeholder, margin, mobileMargin |
| Countdown | timeStyles, labelStyles (color, mobileColor, fontSize, mobileFontSize), margin |
| Image | solo margin, mobileMargin |
| Popup | padding, border, background |

Le proprietà sembrano restituite solo se impostate: assenza ≠ non modificabile.

## Non esposto dal connector → editor

Font family e stile, spaziatura lettere, allineamento, immagini (sorgente e sfondi), visibilità desktop/mobile, ritardo di comparsa, codice header/footer, blocchi predefiniti.
