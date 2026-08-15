# Kühltruhe Inventar – Einrichtung

Eine kleine Web-App, die auf allen euren Handys als "App" installiert werden
kann (Icon auf dem Home-Bildschirm) und die Kühltruhen-Liste in Echtzeit
zwischen allen Geräten synchronisiert. Es ist kein Login nötig – alle Geräte,
die denselben **Haushalts-Code** verwenden, sehen dieselbe Liste.

Die Einrichtung dauert ca. 15–20 Minuten und musst du nur **einmal** machen.
Danach installierst du die App einfach auf den restlichen 3 Handys.

---

## Was du brauchst

- Ein Google-Konto (für das kostenlose Firebase-Projekt)
- Einen GitHub-Account (kostenlos) **oder** du nutzt direkt Firebase Hosting
  – beide Wege sind unten beschrieben, du brauchst nur einen davon
- 15 Minuten Zeit

Kosten: **0 €**. Der kostenlose Firebase-Plan ("Spark") reicht für diese App
locker aus, selbst bei täglicher Nutzung durch mehrere Personen.

---

## Schritt 1: Firebase-Projekt anlegen

1. Gehe auf [https://console.firebase.google.com](https://console.firebase.google.com)
   und melde dich mit deinem Google-Konto an.
2. Klicke auf **"Projekt hinzufügen"**.
3. Gib einen Namen ein, z. B. `kuehltruhe-familie`. Google-Analytics kannst
   du deaktivieren (nicht nötig).
4. Klicke auf **"Projekt erstellen"** und warte, bis es fertig ist.

## Schritt 2: Firestore-Datenbank aktivieren

1. Klicke im linken Menü auf **"Build" → "Firestore Database"**.
2. Klicke auf **"Datenbank erstellen"**.
3. Wähle einen Standort in deiner Nähe (z. B. `eur3 (Europe)`).
4. Wähle **"Im Testmodus starten"** (wir passen die Regeln gleich sicherer an).
5. Klicke auf **"Aktivieren"**.

Danach gehst du oben auf den Reiter **"Regeln"** und ersetzt den Inhalt durch
Folgendes:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /haushalte/{haushaltId}/artikel/{artikelId} {
      allow read, write: if true;
    }
  }
}
```

Klicke auf **"Veröffentlichen"**.

> Hinweis: Damit kann jeder, der euren Haushalts-Code kennt (und die
> Firebase-Projekt-ID errät), die Liste sehen/ändern. Für eine private
> Familien-App ist das üblich und unkritisch – wählt einfach einen
> Haushalts-Code, der nicht leicht zu erraten ist (z. B. nicht "test" oder
> "familie", sondern etwas Individuelles wie `bergmann-gefriertruhe-7`).

## Schritt 3: Web-App im Firebase-Projekt registrieren

1. Klicke oben links auf das **Zahnrad-Symbol → "Projekteinstellungen"**.
2. Scrolle runter zu **"Meine Apps"** und klicke auf das **Web-Symbol `</>`**.
3. Gib einen App-Spitznamen ein, z. B. `kuehltruhe-web`. Häkchen bei
   "Firebase Hosting einrichten" **kannst** du setzen, wenn du Schritt 5a
   (Firebase Hosting) nutzen willst.
4. Klicke auf **"App registrieren"**.
5. Du siehst jetzt einen Code-Block mit `const firebaseConfig = { ... }`.
   Diese Werte brauchst du im nächsten Schritt.

## Schritt 4: Konfiguration in die App eintragen

Öffne die Datei **`firebase-config.js`** aus diesem Ordner in einem
Texteditor und trage die Werte aus Schritt 3 ein, z. B.:

```js
export const firebaseConfig = {
  apiKey: "AIzaSyD-dein-echter-key",
  authDomain: "kuehltruhe-familie.firebaseapp.com",
  projectId: "kuehltruhe-familie",
  storageBucket: "kuehltruhe-familie.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

Speichern nicht vergessen.

## Schritt 5: App online verfügbar machen

Damit alle 4 Handys die App über einen Link öffnen können, muss sie irgendwo
gehostet werden. Zwei einfache, kostenlose Optionen:

### Option A: Firebase Hosting (empfohlen, passt direkt zum Projekt)

Auf deinem Computer (benötigt [Node.js](https://nodejs.org)):

```bash
npm install -g firebase-tools
firebase login
cd kuehltruhe-app
firebase init hosting
# Bei den Fragen: bestehendes Projekt auswählen (dein kuehltruhe-familie),
# "public directory" = aktueller Ordner ("."), 
# "single-page app" = No, bestehende index.html NICHT überschreiben lassen
firebase deploy
```

Am Ende bekommst du eine Adresse wie `https://kuehltruhe-familie.web.app` –
das ist der Link, den ihr auf allen Handys öffnet.

### Option B: GitHub Pages (auch kostenlos, ohne Firebase CLI)

1. Erstelle auf [github.com](https://github.com) ein neues, öffentliches
   Repository, z. B. `kuehltruhe-app`.
2. Lade alle Dateien aus diesem Ordner dort hoch (per "Add file → Upload
   files" im Browser, oder per `git push`).
3. Gehe im Repository auf **"Settings" → "Pages"**.
4. Bei "Branch" wähle `main` und Ordner `/ (root)`, dann **Save**.
5. Nach ein bis zwei Minuten ist die App erreichbar unter
   `https://DEIN-BENUTZERNAME.github.io/kuehltruhe-app/`.

## Schritt 6: Auf allen 4 Handys installieren

Öffne den Link aus Schritt 5 auf jedem der 4 Handys im Browser (Safari bei
iPhone, Chrome bei Android):

- **iPhone (Safari):** Teilen-Symbol antippen → "Zum Home-Bildschirm"
- **Android (Chrome):** Menü (drei Punkte) → "Zum Startbildschirm hinzufügen"
  bzw. "App installieren"

Beim ersten Öffnen fragt die App nach einem **Haushalts-Code** – auf allen
4 Handys **denselben Code** eingeben (z. B. `bergmann-gefriertruhe-7`).
Danach sind alle vier Geräte miteinander verbunden: Was auf einem Handy
hinzugefügt oder geändert wird, erscheint sofort auf den anderen dreien.

---

## Nutzung

- Oben Name eingeben, Menge einstellen, auf **"+"** tippen → Artikel wird
  hinzugefügt (existiert der Artikel schon, wird die Menge einfach erhöht).
- Mit **–** und **+** neben jedem Artikel die Menge anpassen. Bei 0 wird der
  Artikel automatisch entfernt.
- Mit dem Papierkorb-Symbol einen Artikel direkt löschen.
- Über das Zahnrad oben rechts könnt ihr den Haushalts-Code wechseln, falls
  ihr z. B. eine zweite, separate Liste (etwa für eine zweite Kühltruhe)
  anlegen wollt.

## Fehlerbehebung

- **"Firebase ist noch nicht eingerichtet"** → `firebase-config.js` wurde
  noch nicht mit echten Werten befüllt (Schritt 4).
- **Änderungen erscheinen nicht auf anderen Handys** → Prüfen, ob wirklich
  auf allen Geräten exakt derselbe Haushalts-Code eingegeben wurde (Groß-/
  Kleinschreibung spielt keine Rolle, Leerzeichen werden automatisch zu
  Bindestrichen).
- **"Verbindungsfehler" in der Statuszeile** → Firestore-Regeln aus Schritt 2
  noch einmal prüfen und veröffentlichen.
