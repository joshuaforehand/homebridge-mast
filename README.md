# homebridge-mast

Homebridge plugin for the [Mast](https://www.mast.today/) flag status API.

It exposes a HomeKit contact sensor that is detected when the selected flag
status is half-mast / half-staff. It also exposes three mutually-exclusive
override switches:

- `Automatic`: use the Mast API
- `Force Half Staff`: force half-mast
- `Force Full Staff`: force full-staff

HomeKit does not provide a native single tri-state switch control, so the three
switch services represent the three override states.

## Configuration

```json
{
  "platform": "Mast",
  "name": "Mast Flag Status",
  "apiKey": "YOUR_MAST_LICENSE_KEY",
  "countryCode": "US",
  "stateCode": "AZ",
  "pollIntervalSeconds": 900
}
```
**Head over to [MAST API](https://mast.today/api.html) to obtain a Free Mast API License.**

`apiKey` is sent to Mast as the `x-mast-license-key` header.
Requests identify themselves with the user agent
`Homebridge (homebridge-mast; +https://github.com/joshuaforehand/homebridge-mast)`.

Leave `stateCode` blank to use national status only.

## Development

Use `npm ci`, `npm run lint`, and `npm test` to install dependencies, lint the
TypeScript source, and run the regression tests. Tests exercise Homebridge's
actual HomeKit characteristic handlers as well as API failures and accessory
restoration. A paired Homebridge/HomeKit installation is still needed for
end-to-end verification in Apple's Home app.

Selecting an override saves it to the Homebridge accessory cache. Turning off
the selected switch restores it to On; select a different mode to change modes.
API requests time out after 10 seconds, and overlapping refreshes share a request.
Changing the configured location removes the previous location's accessory;
HomeKit automations targeting that accessory may need updating.

## Publishing

The npm trusted publisher must use:

- Organization or user: `joshuaforehand`
- Repository: `homebridge-mast`
- Workflow filename: `publish.yml`
- Environment name: leave blank
- Allow npm publish: enabled

After merging the release changes, create a GitHub release with a tag matching
`package.json`, for example `v0.1.1`. The publishing workflow builds, lints, and
tests before publishing through npm OIDC. It skips prereleases and rejects tags
that do not match the package version. No npm token secret is needed.

## Names in Apple Home

The accessory contains `Automatic`, `Force Half Staff`, and `Force Full Staff`
switches, plus a `Flag Half Staff` contact sensor. Only one mode is selected.
The overrides change the reported status; they do not physically move a flag.

Apple Home uses its built-in contact sensor wording: **Closed means half-staff;
Open means full-staff**. In Automatic mode, check for a fault if API data is
unavailable; Open alone does not prove a successful API refresh.

After updating, restart the Mast child bridge to add the names to existing
services. Service identities are preserved, so re-pairing is not required by
this change. Apple Home may retain names saved locally; if generic names remain,
edit the individual tile names in Home. Names already stored in ConfiguredName
are preserved on restart.
