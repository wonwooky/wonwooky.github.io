# wonwooky.github.io
DAH website

## Apps Script data source

The website reads the hospital list from the Apps Script web app, not from the checked-in JSON file.

1. In Apps Script project settings, confirm the `SPREADSHEET_ID` script property is `1E6Nl_TbQlZiQX5tHO47yvRMrjmHg9Y_fojBfcvGu_Nk`. The API reads this property; the coordinate updater checks that it matches the target sheet.
2. Run `checkSetup()` in the editor. Its log should show `spreadsheetMatchesExpected: true` and `coordinatesCount: 81`.
3. If the coordinate updater has not been run, run `updateHospitalCoordinatesForLeafletMap()` once and authorize it. Review the geocoded values in the sheet.
4. When `doGet` or its mapping changes, deploy a new web-app version. The deployed `/exec` endpoint is configured in `js/config.js` and must remain publicly readable.

The Apps Script endpoint returns JSON with CORS enabled. The page maps its `{ ok, hospitals }` response to the site data model. Hospitals without valid coordinates remain in the directory but are not plotted or clickable on the map.
