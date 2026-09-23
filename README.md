# Letterland 🐼

Oefenapp om letters (klanken) en daarna eenvoudige woorden te leren lezen, voor een kind in de 3de kleuterklas.
Gebouwd volgens dezelfde architectuur als [Tafels Kampioen](https://github.com/tessadebacker/tafels-kampioen).

## Bestanden

| Bestand | Wat |
|---|---|
| `index.html`, `style.css`, `script.js` | De app (statische website, geen build nodig) |
| `js/data.js` | **Alle inhoud**: lettervolgorde, voorbeeldwoorden + emoji's, woordenlijst, instructiezinnen |
| `js/audio.js` | Opnemen (WAV), bewaren (IndexedDB) en afspelen; iPhone-stem als terugval |
| `js/store.js` | Voortgang: localStorage + synchronisatie via Firestore (`updateDoc` per veld) |
| `js/firebase-config.js` | Hier komt later de Firebase-config (nu `null` → enkel lokaal) |
| `manifest.json`, `icons/` | Installeerbaar als app (PWA, "Zet op beginscherm") |
| `tools/icon.html` | Bron van het app-icoon |

## Didactiek in het kort

- **Klanken**, geen letternamen. Volgorde geïnspireerd op Veilig Leren Lezen; b/d, p/q, ie/ei ver uit elkaar.
- Per letter: korte les → oefensessies van 10 → toets van 6 (alles juist).
- 4 oefentypes per letter, elk moet 3x na elkaar juist zijn: klank horen → letter kiezen,
  letter zien → klank kiezen, plaatje → beginletter, alle letters zoeken tussen gelijkenden.
- Toets beschikbaar als alles 3x juist is, óf na een foutloze sessie. Toets mislukt → eerst weer een sessie.
- Geen tijdsdruk. Sterren per sessie/toets, in te wisselen voor beloningen die de ouder beheert.
- Woorden worden pas vrijgegeven als alle klanken erin gekend zijn (vanaf 3 woorden gaat "Woorden" open).
- Instellingen (⚙️) zitten achter een rekensommetje (ouderpoort).

## Lokaal testen

```bash
python -m http.server 8765
```
Open dan http://localhost:8765 (voeg `?debug` toe voor testhulpjes in de console).

## Firebase instellen (voortgang + opnames delen tussen toestellen)

1. Nieuw project op console.firebase.google.com (niet dat van Tafels Kampioen hergebruiken).
2. Firestore Database → *Start in production mode* → locatie `eur3`.
3. Rules:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /progress/letterland-familie {
         allow read, write: if true;
       }
       match /letterlandAudio/{clip} {
         allow read, delete: if true;
         allow create, update: if clip.matches('^[a-z0-9_]{1,40}$')
           && request.resource.data.data is string
           && request.resource.data.data.size() < 500000;
       }
     }
   }
   ```
4. Project settings → web-app toevoegen → `firebaseConfig` plakken in `js/firebase-config.js`.

## Tips voor het inspreken

- Neem op in een stille kamer, telefoon op ±20 cm.
- Zeg de **klank**: "mmm", "sss", "aa". Korte klanken (k, p, t, d, b) heel kort, zonder "uh" erachter.
- Na elke opname speelt de app ze meteen af; niet goed → gewoon opnieuw opnemen.
- De iPhone mag niet op stil staan (zijschakelaar), anders hoor je niets.
