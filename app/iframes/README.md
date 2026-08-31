# Iframe Embeddable Content

This directory contains iframe-compatible pages that partners can embed in their websites.

## Example Conversations

### Usage

Partners can embed example conversations using the following URL pattern:

```
/iframes/example-conversations/[exampleConversationId]
```

### Embedding

To embed an example conversation in an iframe:

```html
<iframe
  src="https://yourdomain.com/iframes/example-conversations/[conversationId]"
  width="360"
  height="736"
  frameborder="0"
  allowtransparency="true"
></iframe>
```

### Features

- **No branding**: The page contains only the WhatsApp simulator without any branding or navigation
- **Responsive**: The WhatsApp simulator is designed to fit within a 360x736 pixel container
- **Minimal layout**: Clean, distraction-free presentation perfect for embedding
- **Quote conversations**: Works with conversations generated for quotes

### Technical Details

The page:

- Fetches conversation data using the `exampleConversationId`
- Displays the WhatsApp simulator with all messages
- Shows the appropriate organisation name and logo from the quote
- Handles missing conversations with a proper not-found page
- Uses minimal styling to ensure compatibility with parent page styles
