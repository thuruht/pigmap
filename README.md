# PigMap.org

A real-time, crowdsourced livestock location tracker built with Cloudflare Workers.

## Overview

PigMap.org is a web application that allows users in the USA to anonymously report and track livestock sightings in real-time. The application uses a map interface to display reported sightings, allowing users to:

- View recent livestock sightings
- Report new livestock sightings with details and media
- Receive real-time updates as new sightings are reported
- Access the site in 17 different languages

## Features

- Fully anonymous reporting of livestock sightings (no IP addresses or personal data stored)
- Real-time updates via WebSockets
- Media upload capabilities (photos/videos)
- Proximity-based sorting of reports
- Multilingual interface with support for 17 languages
- Mobile-friendly, accessible interface
- Right-to-left (RTL) language support
- Keyboard navigation and screen reader accessibility

## Technology

PigMap.org is built with:

- **Frontend**: Leaflet.js for mapping, with vanilla JavaScript
- **Backend**: Cloudflare Workers
- **Storage**:
  - Cloudflare D1 (SQLite database) for structured data
  - Cloudflare R2 for media storage (images/videos)
  - Cloudflare KV for configuration
- **Real-time Updates**: Cloudflare Durable Objects and WebSockets

## Development

### Prerequisites

- Node.js and npm
- Cloudflare account with Workers, R2, KV, and D1 access

### Local Development

1. Install dependencies:

```bash
npm install
```

2. Update the wrangler.toml file with your Cloudflare account details:
   - R2 bucket IDs
   - KV namespace IDs
   - D1 database IDs

3. Start the local development server:

```bash
npm run dev
```

### Deployment

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Domains

The application is deployed to Cloudflare Workers and can be accessed at:
- [pigmap.org](https://pigmap.org) - Main domain
- [kc.pigmap.org](https://kc.pigmap.org) - Kansas City, MO region
- [kcmo.pigmap.org](https://kcmo.pigmap.org) - Kansas City, MO region (alternate)
- [kansascity.pigmap.org](https://kansascity.pigmap.org) - Kansas City, MO region (alternate)

## Localization

PigMap supports the following languages:
- English
- Spanish (Español)
- Haitian Creole (Kreyòl Ayisyen)
- Chinese (中文)
- Vietnamese (Tiếng Việt)
- Arabic (العربية)
- Amharic (አማርኛ)
- Swahili (Kiswahili)
- Somali (Soomaali)
- Farsi (فارسی)
- French (Français)
- Nepali (नेपाली)
- Karen
- Burmese (မြန်မာဘာသာ)
- Portuguese (Português)
- Urdu (اردو)
- Kurdish (Kurdî)

## License

MIT

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## Database Schema

The application uses Cloudflare D1 (SQLite) with the following schema:

- **reports**: Stores livestock sighting reports
- **media**: Stores references to media files in R2

## Features

- **Geolocation**: Find user's current location
- **Real-time Updates**: WebSocket-based live updates of new reports
- **Media Uploads**: Support for image and video uploads
- **Proximity Sorting**: Show nearest sightings first
- **Time-based Rendering**: Older reports fade out over time

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact [admin@pigmap.org](mailto:admin@pigmap.org)

## Privacy

PigMap.org is designed with privacy as a core principle:

- **No IP Addresses**: We do not store IP addresses or any personally identifiable information
- **Anonymous Contributions**: All reports and comments are completely anonymous
- **Minimal Data Collection**: Only the information explicitly provided by users is stored
- **Media Privacy**: Uploaded media is stored without any metadata that could identify the source
- **No Analytics**: We don't use any third-party analytics or tracking

If you want to clear any existing IP data from your deployment, run:

```bash
npx wrangler d1 execute LIVESTOCK_DB --file=./clear_ip_data.sql
```
