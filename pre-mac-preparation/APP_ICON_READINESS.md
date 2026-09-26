# Apple-icon readiness — kandidaat aanwezig

Status: **READY voor Apple-assetvoorbereiding**. De goedgekeurde iconset is lokaal uitgepakt naar `pre-mac-preparation/assets/COMPR-App-Icon-Set/`. Bron: `C:\Users\ms-ti\Downloads\COMPR-App-Icon-Set.zip`, SHA-256 `652435647150057236f73d2252ba21011419caef32575e4e62d8255e6b80dc01`. Het oorspronkelijk opgegeven `incoming/`-pad bestond niet; het expliciet meegestuurde Downloads-bestand had de juiste hash. De bestaande bevroren Mac Day Kit en runtime-iconen blijven onaangeroerd.

| Nieuw bestand | Formaat/afmeting | Eigenschappen | Doel |
|---|---|---|---|
| `COMPR-App-Icon-1024.png` | PNG 1024×1024 | 8-bit RGB, PNG-kleurtype 2, geen alpha/transparantie | **Goedgekeurde kandidaat** voor toekomstige Apple AppIcon-master |
| `COMPR-App-Icon-Master-1254.png` | PNG 1254×1254 | 8-bit RGB, kleurtype 2, geen alpha/transparantie | Hogere-resolutie bronmaster |
| `icon128.png` | PNG 128×128 | 8-bit RGB, kleurtype 2, geen alpha/transparantie | Kleine kandidaat, runtime nog niet vervangen |
| `icon48.png` | PNG 48×48 | Idem | Kleine kandidaat |
| `icon32.png` | PNG 32×32 | Idem | Kleine kandidaat |
| `icon16.png` | PNG 16×16 | Idem | Kleine kandidaat |

Alle pixels van alle zes beelden hadden alpha 255. In de PNG-chunks is geen expliciet `iCCP`, `sRGB` of `gAMA`-profiel gevonden; het exacte kleurprofiel is dus **niet bewezen**. De 1254px-master bevat een `caBX`-chunk, zonder vastgesteld effect op kleurbeheer. Xcode/Apple Asset Catalog moet het bestand en de kleurweergave op de Mac uiteindelijk beoordelen.

Visuele inspectie: de 1024px-master toont een scherpe zwarte COMPR-C met twee pijlen op een volledig witte, niet-transparante achtergrond. 128 en 48 px zijn helder. Op 32 px blijft het symbool herkenbaar; op 16 px is vooral de C leesbaar en worden pijldetails klein. Toets op een echt Mac/iPhone-scherm de definitieve weergave op lichte/donkere context en Apple’s actuele assetregels.

De eerdere blocker “geen 1024px-bron” is opgelost. **Nog niet gedaan:** importeren in de Xcode Asset Catalog, kiezen van definitieve slots, signed-buildweergave en App Store-validatie. Dit gebeurt pas op de Mac. Geen bestaande runtime-iconen of manifesten vervangen.
