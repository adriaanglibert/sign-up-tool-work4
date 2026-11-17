# Branch inschrijving

Next.js-app voor first-come-first-serve-inschrijvingen. Studenten rangschikken drie verschillende Branches; de server wijst hen automatisch toe aan de eerste VZW met vrije capaciteit binnen hun hoogst gerangschikte Branch. Als alle drie de Branches volzet zijn, komt de student op de wachtlijst.

## Opstarten

```bash
npm install
cp .env.example .env.local
```

Vul in `.env.local` een uniek beheerderswachtwoord en een willekeurig sessiegeheim in. Genereer dat geheim bijvoorbeeld met `openssl rand -hex 32`.

```env
ADMIN_PASSWORD=gebruik-een-lang-uniek-wachtwoord
ADMIN_SESSION_SECRET=plaats-hier-een-willekeurig-geheim-van-minstens-32-bytes
```

Start de applicatie:

```bash
npm run dev
```

Studenten: <http://localhost:3000>
Beheer: <http://localhost:3000/admin>

Voor productie: `npm run build` en daarna `npm run start`. Node.js 20.9 of nieuwer is vereist.

## Gegevens en beheer

- `data/matrix.json` bevat de 8 VZW's, 6 Branches en initiële 99 plaatsen.
- `data/submissions.json` bevat inschrijvingen, tijdstippen, drie Branchvoorkeuren en de automatisch toegewezen VZW + Branch.
- `data/settings.json` bepaalt of inschrijven openstaat.
- De beheerder kan capaciteit aanpassen, inschrijvingen openen/sluiten, filteren, exporteren naar JSON/CSV en alle inschrijvingen resetten.

## Opslag en deployment

Alle bestandsmutaties worden in het Node-proces achtereenvolgens verwerkt. JSON wordt eerst naar een tijdelijk bestand geschreven en daarna atomair vervangen. Dit voorkomt gelijktijdige dubbele toewijzingen en beschadigde individuele bestanden binnen **één Node-proces**.

Deze JSON-opslag is alleen geschikt voor deployment met één serverinstantie, één Node-proces en een persistente, schrijfbare lokale schijf. Serverless hosting, meerdere replicas/processen en ephemeral filesystems zijn niet ondersteund: een in-memory lock en lokale JSON-bestanden kunnen daar geen gedeelde transactie garanderen. Maak regelmatig een back-up van de map `data`. Gebruik voor meerdere instanties een transactionele gedeelde datastore.

Beperk toegang tot `/admin`, gebruik HTTPS, houd `.env.local` geheim en vervang de voorbeeldgeheimen. In productie is `ADMIN_SESSION_SECRET` verplicht; de beheerderssessie wordt als HttpOnly, SameSite-cookie bewaard.
