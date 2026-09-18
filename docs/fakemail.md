# Fakemail with iCloud personal mail

Personal addresses at `kadli.org` receive mail through iCloud. Disposable addresses at
`temp.kadli.org` receive mail through Cloudflare Email Routing, which forwards each
active alias to a verified inbox. The site creates exact-address forwarding rules and
removes them on deletion or expiry. No iCloud credentials are needed by the site.

## Cloudflare dashboard

1. Open **Compute > Email Service > Email Routing**, select `kadli.org`, then open
   **Settings > Subdomains**. Add `temp.kadli.org` (enter `temp` if the form already
   supplies the parent domain). This remains part of the existing `kadli.org` zone.
2. Allow Cloudflare to add the MX and authentication records it supplies for the
   subdomain. Use the exact record values and priorities shown by Cloudflare.
   Keep the root iCloud MX, SPF, Apple verification TXT, and DKIM records intact.
   Do not accept a root-domain setup/repair flow that replaces the iCloud MX records.
   If the dashboard only offers root-domain onboarding, use the subdomain API setup
   below instead. The skip_wizard flag did not expose settings in this dashboard.
3. Under **Destination Addresses**, add your iCloud inbox and complete the emailed
   verification. An existing verified destination can also be used. The configured
   destination must not be another address at `temp.kadli.org`.
4. Under **Routing Rules**, ensure unmatched addresses are dropped: leave catch-all
   forwarding disabled or set its action to **Drop**. Remove any broader forwarding
   rule that would continue receiving mail after an individual alias is removed.
   Leave subaddressing disabled if you need independently expiring aliases containing
   `+`; otherwise they can fall back to a base-address rule after deletion.
5. Reuse the site's API token if it still has **Zone > Email Routing Rules > Edit**
   for the `kadli.org` zone. Otherwise create a token with that permission and scope.
   Use the existing parent zone ID; a separate subdomain zone is not required.

Reference: [Cloudflare subdomains](https://developers.cloudflare.com/email-service/configuration/subdomains/)
and [routing rules](https://developers.cloudflare.com/email-service/configuration/email-routing-addresses/).

## Subdomain API setup when the dashboard only offers root domains

This method successfully enabled `temp.kadli.org` on 2026-09-18 without changing
the root MX records. A public DNS check afterward confirmed that `kadli.org`
still used iCloud and `temp.kadli.org` used Cloudflare.

Use a temporary API token with **Zone > Zone Settings > Edit**, restricted to the
parent `kadli.org` zone. Run the following in PowerShell, supplying that zone's ID:

```powershell
$cfZone = Read-Host 'kadli.org Zone ID'
$cfToken = Read-Host 'Temporary Cloudflare API token' -AsSecureString
$cfCredential = [pscredential]::new('token', $cfToken)

$response = Invoke-RestMethod `
  -Method Post `
  -Uri "https://api.cloudflare.com/client/v4/zones/$cfZone/email/routing/dns" `
  -Headers @{ Authorization = "Bearer $($cfCredential.GetNetworkCredential().Password)" } `
  -ContentType 'application/json' `
  -Body '{"name":"temp.kadli.org"}'

$response | ConvertTo-Json -Depth 10
```

Keep the `name` body: omitting it activates routing on the root domain instead.
Confirm `success: true` and a result naming `temp.kadli.org` with `enabled: true`
and `status: ready`. Then complete destination verification and routing settings
as described above. The returned subdomain ID does not replace the parent zone ID
used by the site's `CLOUDFLARE_ZONE_ID` setting.

The temporary setup token can be revoked afterward. Keep the site's separate
Email Routing Rules token valid for alias creation, deletion, and expiry.

References: [DNS setup API](https://developers.cloudflare.com/api/resources/email_routing/subresources/dns/methods/create/)
and [subdomain payload clarification](https://github.com/cloudflare/terraform-provider-cloudflare/issues/5890).

## Server configuration and deployment

Update the real `.env` used by Docker Compose on the server:

```dotenv
FAKEMAIL_DOMAIN=temp.kadli.org
FAKEMAIL_FORWARD_TO=your-verified-address@icloud.com
```

Keep `CLOUDFLARE_ZONE_ID`, a valid `CLOUDFLARE_API_TOKEN`, and the existing
`FAKEMAIL_CLEANUP_SECRET`. An explicit old `FAKEMAIL_DOMAIN=kadli.org` overrides
the new application default, so it must be changed. Editing `.env.example` alone
does not update the deployed environment. The existing Compose configuration already
passes these variables to the application.

After the updated image has been published, run from the existing Compose directory:

```sh
docker compose pull portfolio
docker compose up -d portfolio fakemail-cleanup
```

Recreating the service applies the environment changes; `docker compose restart`
alone does not. Keep the cleanup service running: it removes expired forwarding rules
every five minutes. The application does not provision or verify Cloudflare DNS.

## Existing aliases and verification

Existing database rows and their Cloudflare rule IDs are preserved. Old `@kadli.org`
addresses are labeled as belonging to a previous domain, and are not silently renamed.
Create replacement aliases and update any accounts that used the old addresses.
Deleting or expiring an old entry only removes its Cloudflare rule; it cannot stop
delivery to an iCloud mailbox or iCloud catch-all.

Once DNS and deployment are ready:

1. Confirm `/admin/fakemail` shows `@temp.kadli.org` for new aliases.
2. Create a test alias and send to it from a different mailbox. Confirm it arrives
   in your verified destination inbox.
3. Delete it, then send a fresh message and confirm it is no longer forwarded.
4. Test a one-hour alias after expiry plus the five-minute cleanup interval.
5. Confirm a normal personal `@kadli.org` address still receives mail in iCloud.
