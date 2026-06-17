import QRCode from 'qrcode'
import { useMemo, useState } from 'react'
import './App.css'

type ItemKind = 'website' | 'phone' | 'email' | 'text'
type ThemeName =
  | 'aurora'
  | 'mono'
  | 'candy'
  | 'void'
  | 'linen'
  | 'daylight'
  | 'graphite'
  | 'navy'
type LayoutName = 'grid' | 'list'

type ShareItem = {
  id: string
  label: string
  value: string
  kind: ItemKind
}

type SharePayload = {
  v: 1
  theme: ThemeName
  layout: LayoutName
  items: ShareItem[]
}

const themes: ThemeName[] = [
  'aurora',
  'mono',
  'candy',
  'void',
  'linen',
  'daylight',
  'graphite',
  'navy',
]
const layouts: LayoutName[] = ['grid', 'list']
const itemKinds: ItemKind[] = ['website', 'phone', 'email', 'text']

const sampleItems: ShareItem[] = [
  {
    id: 'sample-portfolio',
    label: 'Portfolio',
    value: 'https://saqlain1020.com',
    kind: 'website',
  },
  {
    id: 'sample-email',
    label: 'Email',
    value: 'saqlain1020@outlook.com',
    kind: 'email',
  },
  {
    id: 'sample-linkedin',
    label: 'LinkedIn',
    value: 'https://www.linkedin.com/in/saqlain1020/',
    kind: 'website',
  },
]

const kindMeta: Record<ItemKind, { icon: string; label: string; action: string }> = {
  website: { icon: '↗', label: 'Website', action: 'Open' },
  phone: { icon: '☎', label: 'Phone', action: 'Call' },
  email: { icon: '@', label: 'Email', action: 'Mail' },
  text: { icon: '#', label: 'Text', action: 'Copy' },
}

const fallbackPayload: SharePayload = {
  v: 1,
  theme: "graphite",
  layout: "list",
  items: sampleItems,
};

function makeId() {
  if ('crypto' in window && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function detectKind(value: string): ItemKind {
  const trimmed = value.trim()

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'email'
  }

  if (/^(tel:)?\+?[\d\s().-]{7,}$/.test(trimmed)) {
    return 'phone'
  }

  if (/^(https?:\/\/|www\.)[^\s]+$/i.test(trimmed)) {
    return 'website'
  }

  return 'text'
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

function itemHref(item: ShareItem) {
  if (item.kind === 'website') {
    return normalizeUrl(item.value)
  }

  if (item.kind === 'email') {
    return `mailto:${item.value.trim()}`
  }

  if (item.kind === 'phone') {
    return `tel:${item.value.replace(/[^\d+]/g, '')}`
  }

  return undefined
}

function encodePayload(payload: SharePayload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload))
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodePayload(encoded: string): SharePayload | null {
  try {
    const padded = encoded.replaceAll('-', '+').replaceAll('_', '/')
    const base64 = padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed = JSON.parse(new TextDecoder().decode(bytes))

    return validatePayload(parsed)
  } catch {
    return null
  }
}

function validatePayload(value: unknown): SharePayload | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const payload = value as Partial<SharePayload>

  if (
    payload.v !== 1 ||
    !themes.includes(payload.theme as ThemeName) ||
    !layouts.includes(payload.layout as LayoutName) ||
    !Array.isArray(payload.items)
  ) {
    return null
  }

  const items = payload.items
    .filter((item): item is ShareItem => {
      if (!item || typeof item !== 'object') {
        return false
      }

      const candidate = item as Partial<ShareItem>

      return (
        typeof candidate.id === 'string' &&
        typeof candidate.label === 'string' &&
        typeof candidate.value === 'string' &&
        itemKinds.includes(candidate.kind as ItemKind)
      )
    })
    .slice(0, 24)

  return {
    v: 1,
    theme: payload.theme as ThemeName,
    layout: payload.layout as LayoutName,
    items,
  }
}

function readRouteState() {
  const [, marker, encoded] = window.location.pathname.split('/')

  if (marker !== 's' || !encoded) {
    return {
      payload: fallbackPayload,
      isSharedRoute: false,
    }
  }

  return {
    payload: decodePayload(encoded) ?? fallbackPayload,
    isSharedRoute: true,
  }
}

function App() {
  const routeState = useMemo(() => readRouteState(), [])
  const initialPayload = routeState.payload
  const isSharedRoute = routeState.isSharedRoute
  const [items, setItems] = useState<ShareItem[]>(
    isSharedRoute ? [] : initialPayload.items,
  )
  const [theme, setTheme] = useState<ThemeName>(initialPayload.theme)
  const [layout, setLayout] = useState<LayoutName>(initialPayload.layout)
  const [label, setLabel] = useState('')
  const [value, setValue] = useState('')
  const [kind, setKind] = useState<ItemKind>('website')
  const [copied, setCopied] = useState('')

  const payload = useMemo<SharePayload>(
    () => ({
      v: 1,
      theme,
      layout,
      items,
    }),
    [items, layout, theme],
  )

  const shareUrl = useMemo(() => {
    const encoded = encodePayload(payload)
    return `${window.location.origin}/s/${encoded}`
  }, [payload])

  function handleValueChange(nextValue: string) {
    setValue(nextValue)
    setKind(detectKind(nextValue))
  }

  function handleAddItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedValue = value.trim()

    if (!trimmedValue) {
      return
    }

    setItems((currentItems) => [
      ...currentItems,
      {
        id: makeId(),
        label: label.trim() || kindMeta[kind].label,
        value: trimmedValue,
        kind,
      },
    ])
    setLabel('')
    setValue('')
    setKind('website')
  }

  async function copyText(text: string, token: string) {
    await navigator.clipboard.writeText(text)
    setCopied(token)
    window.setTimeout(() => setCopied(''), 1800)
  }

  async function downloadQrCode() {
    const dataUrl = await QRCode.toDataURL(shareUrl, {
      width: 1200,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
    const link = document.createElement('a')

    link.href = dataUrl
    link.download = 'unilink-qr.png'
    link.click()
  }

  function renderItemBoard(
    boardItems: ShareItem[],
    boardLayout: LayoutName,
    allowRemove: boolean,
  ) {
    return (
      <div className={`item-board ${boardLayout}`}>
      {boardItems.length === 0 ? (
        <div className="empty-state">
          <p>No items yet. Add something loud enough to survive the URL.</p>
        </div>
      ) : (
        boardItems.map((item, index) => {
          const href = itemHref(item)
          const meta = kindMeta[item.kind]

          return (
            <article className="item-card" key={item.id}>
              <div className="item-index">{String(index + 1).padStart(2, '0')}</div>
              <div className="item-icon">{meta.icon}</div>
              <div className="item-content">
                <p className="item-kind">{meta.label}</p>
                <h3>{item.label}</h3>
                <p>{item.value}</p>
              </div>
              <div className="item-actions">
                {href ? (
                  <a href={href} target="_blank" rel="noreferrer">
                    {meta.action}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => copyText(item.value, item.id)}
                  >
                    {copied === item.id ? 'Copied' : meta.action}
                  </button>
                )}
                {allowRemove && (
                  <button
                    type="button"
                    onClick={() =>
                      setItems((currentItems) =>
                        currentItems.filter((currentItem) => currentItem.id !== item.id),
                      )
                    }
                  >
                    Remove
                  </button>
                )}
              </div>
            </article>
          )
        })
      )}
    </div>
    )
  }

  const hero = (
    <section className="hero-panel">
        <div className="eyebrow">
          <span>Unilink</span>
          <span>No account. No database. Just a link.</span>
        </div>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="kicker">Portable item constellations</p>
            <h1>Turn anything worth sharing into one strange, beautiful URL.</h1>
            <p className="intro">
              Add websites, phone numbers, emails, or plain notes. Unilink
              folds the board into Base64 JSON and rebuilds it for anyone who
              opens the generated path.
            </p>
          </div>

          <div className="control-deck" aria-label="Display controls">
            <div>
              <p className="deck-label">Theme reactor</p>
              <div className="segmented">
                {themes.map((themeName) => (
                  <button
                    type="button"
                    className={theme === themeName ? 'active' : ''}
                    onClick={() => setTheme(themeName)}
                    key={themeName}
                  >
                    {themeName}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="deck-label">Item formation</p>
              <div className="segmented">
                {layouts.map((layoutName) => (
                  <button
                    type="button"
                    className={layout === layoutName ? 'active' : ''}
                    onClick={() => setLayout(layoutName)}
                    key={layoutName}
                  >
                    {layoutName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
  )

  const workbench = (
    <section className="workbench" id="make-your-own">
        <form className="composer" onSubmit={handleAddItem}>
          <div className="section-heading">
            <p className="kicker">Feed the machine</p>
            <h2>Add an item</h2>
          </div>

          <label>
            <span>Label</span>
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Portfolio, Mom, Launch notes..."
            />
          </label>

          <label>
            <span>Website, phone, email, or text</span>
            <input
              value={value}
              onChange={(event) => handleValueChange(event.target.value)}
              placeholder="https://example.com"
              required
            />
          </label>

          <label>
            <span>Detected type</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as ItemKind)}
            >
              {itemKinds.map((itemKind) => (
                <option value={itemKind} key={itemKind}>
                  {kindMeta[itemKind].label}
                </option>
              ))}
            </select>
          </label>

          <button className="primary-action" type="submit">
            Add to orbit
          </button>
        </form>

        <div className="share-card">
          <div className="section-heading">
            <p className="kicker">Share spell</p>
            <h2>Generated URL</h2>
          </div>
          <p>
            This URL contains the entire board. The app decodes it from the
            path when someone visits.
          </p>
          <div className="url-box">{shareUrl}</div>
          <div className="share-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => copyText(shareUrl, 'share')}
            >
              {copied === 'share' ? 'Copied link' : 'Copy generated URL'}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={downloadQrCode}
            >
              Download QR code
            </button>
          </div>
        </div>
      </section>
  )

  const preview = (
    <section className="preview-panel">
        <div className="preview-header">
          <div>
            <p className="kicker">Live payload preview</p>
            <h2>{items.length} items ready to transmit</h2>
          </div>
          <button
            className="ghost-action"
            type="button"
            onClick={() => setItems([])}
            disabled={items.length === 0}
          >
            Clear board
          </button>
        </div>
        {renderItemBoard(items, layout, true)}
      </section>
  )

  return (
    <main className={`app-shell theme-${theme}`}>
      <div className="noise" aria-hidden="true" />
      <div className="orb orb-one" aria-hidden="true" />
      <div className="orb orb-two" aria-hidden="true" />

      {isSharedRoute ? (
        <>
          <section className="shared-panel">
            {renderItemBoard(initialPayload.items, initialPayload.layout, false)}
          </section>
          <section className="make-panel">
            <div>
              <p className="kicker">Want one too?</p>
              <h2>Make your own link board.</h2>
            </div>
            <a className="make-link" href="/">
              Make your own
            </a>
          </section>
        </>
      ) : (
        <>
          {hero}
          {workbench}
          {preview}
        </>
      )}
    </main>
  );
}

export default App
