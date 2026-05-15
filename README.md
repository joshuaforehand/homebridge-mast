# homebridge-mast

Homebridge plugin for the [Mast](https://www.mast.today/) flag status API.

It exposes a HomeKit contact sensor that is detected when the selected flag
status is half-mast / half-staff. It also exposes three mutually-exclusive
override switches:

- `Override Auto`: use the Mast API
- `Override On`: force half-mast
- `Override Off`: force full-staff

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

Leave `stateCode` blank to use national status only.
