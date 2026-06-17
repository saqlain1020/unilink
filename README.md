# Unilink

Unilink is a client-only share board for turning a small set of links, emails, phone numbers, or text items into one portable URL.

Nothing is saved to a backend. The app serializes the board into JSON, Base64 URL-encodes it, and places the payload in a path like `/s/<encoded>`. Opening that path decodes the payload in the browser and shows the shared items first.

## Features

- Add websites, email addresses, phone numbers, or plain text.
- Auto-detect item type while allowing manual type changes.
- Generate a shareable URL containing the full board and UI settings.
- Open shared URLs on a share-first page with the items shown before creation tools.
- Switch between grid/list layouts and multiple visual themes.
- Run fully in the browser with no database, account, or server storage.

## Tech Stack

- Vite
- React
- TypeScript
- Bun

## Getting Started

Install dependencies:

```sh
bun install
```

Run the development server:

```sh
bun run dev
```

Build for production:

```sh
bun run build
```

Lint the project:

```sh
bun run lint
```

## URL Payload

Shared links use this shape:

```ts
type SharePayload = {
  v: 1
  theme: string
  layout: 'grid' | 'list'
  items: Array<{
    id: string
    label: string
    value: string
    kind: 'website' | 'phone' | 'email' | 'text'
  }>
}
```

The payload is encoded directly into the URL path, so very large boards will create long URLs. This first version is best for concise collections of items.
