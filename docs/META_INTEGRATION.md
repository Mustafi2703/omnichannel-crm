# Meta Integration Guide (Messenger, Instagram, comments, Lead Ads)

One Meta app owned by the client's business connects the Facebook Page and the Instagram account to
`POST /api/webhooks/meta` (`src/app/api/webhooks/meta/route.ts`, adapter `src/lib/meta.ts`).

| Meta event | What the CRM does |
| --- | --- |
| Messenger message or Get Started button | Conversation `messenger`; the assistant replies (`aiMode` auto) |
| Instagram DM | Conversation `instagram`; the assistant replies |
| Page post or ad comment | Conversation `facebook_comment`; **no automatic reply** until the client's comment rules are agreed. An Inbox reply is posted publicly under the latest comment |
| Instagram comment | Conversation `instagram_comment`; same as Page comments |
| Lead Ads form submission | Contact (by phone or email) + lead in the first pipeline stage, tagged `meta_lead_form`, all answers in `qualification`; fires the `lead_qualified` automation |

Messages are stored before the 200 response; names, assistant replies and lead answers are fetched from
the Graph API (v25.0) afterwards. Redeliveries are dropped by Meta's message or comment id.

## Go-live checklist

1. **Business access:** hello@twinoxis.com is admin of the client's business portfolio, with the Page,
   the Instagram account and the ad account assigned. The business must be verified for app review.
2. **Instagram:** a professional account linked to the Page, with Settings → Messages → Connected
   tools → *Allow access to messages* switched on.
3. **Meta app** (developers.facebook.com, type Business, owned by the client's business portfolio):
   add Messenger, Instagram and Webhooks.
4. **Webhooks:** callback `https://eacrm.net/api/webhooks/meta`, verify token = `META_VERIFY_TOKEN`.
   - Page object: `messages`, `messaging_postbacks`, `feed`, `leadgen`
   - Instagram object: `messages`, `comments`
5. **Token:** in Business Settings create a System User, assign it the Page and the Instagram account,
   generate a token with the permissions below, then read the Page's own token with
   `GET /{page-id}?fields=access_token`. That Page token does not expire → `META_PAGE_ACCESS_TOKEN`.
6. **Subscribe the Page to the app:**
   `POST /{page-id}/subscribed_apps?subscribed_fields=messages,messaging_postbacks,feed,leadgen` with the Page token.
7. **Lead Ads:** Page Settings → Leads Access → give the app (CRM) access.
8. **Server `.env`** (app and worker), then `docker compose up -d app worker`:
   `META_APP_SECRET`, `META_VERIFY_TOKEN`, `META_PAGE_ACCESS_TOKEN`, `DEFAULT_TENANT_SLUG`.
9. **Auto-replies:** turn off Meta Business Suite instant replies and away messages, and any other tool
   answering Page or Instagram messages, so customers do not get two answers.
10. **App review** for Advanced Access (days to weeks). Until then only people with a role on the app
    can test. Needs a privacy policy URL (the KVKK page), a data-deletion URL, a 1024 px icon and
    screen recordings of each permission in use.

### Permissions

| Feature | Permissions |
| --- | --- |
| Messenger | `pages_messaging`, `pages_manage_metadata`, `pages_show_list` |
| Page comments | `pages_read_engagement`, `pages_read_user_content`, `pages_manage_engagement` |
| Instagram DMs and comments | `instagram_basic`, `instagram_manage_messages`, `instagram_manage_comments` |
| Lead Ads | `leads_retrieval`, `pages_manage_ads` |
| System User token | `business_management` |

## Local test

Without `META_PAGE_ACCESS_TOKEN`, replies are logged as demo sends and lead answers are not fetched.

```bash
BODY='{"object":"page","entry":[{"id":"PAGE1","messaging":[{"sender":{"id":"PSID1"},"timestamp":1,"message":{"mid":"m.test1","text":"Merhaba"}}]}]}'
SIG=$(node -e "console.log('sha256=' + require('crypto').createHmac('sha256', process.env.META_APP_SECRET).update(process.argv[1]).digest('hex'))" "$BODY")
curl -X POST http://localhost:3000/api/webhooks/meta -H "Content-Type: application/json" -H "X-Hub-Signature-256: $SIG" -d "$BODY"
curl "http://localhost:3000/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=$META_VERIFY_TOKEN&hub.challenge=ok"
```

## Not built yet

- Replies after Meta's 24-hour window (needs the `HUMAN_AGENT` tag, which has its own review); they fail
  with Meta's error shown on the message
- Private DM replies to comments, and the assistant answering comments (waits on the client's rules)
- The first WhatsApp template to a new form lead (needs the approved template), and reading a WhatsApp
  consent answer from the form into `consentWhatsappMarketing`
