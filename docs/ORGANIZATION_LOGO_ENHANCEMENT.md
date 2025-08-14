# Testing the Organization Logo Enhancement

## Test Cases

### 1. Test Dynamic Manifest with Organization Logo

**Steps to test**:

1. Visit the customer app with organization parameters: `http://localhost:3002/?org=YOUR_ORG_ID`
2. Check the dynamic manifest: `http://localhost:3002/api/manifest?org=YOUR_ORG_ID`
3. Verify the manifest includes:
   - Organization name in app title
   - Organization logo in icons array
   - Organization primary color as theme color
   - Correct start_url with parameters

**Expected Result**:

```json
{
  "name": "Your Organization - Smart Queue",
  "short_name": "Your Organization",
  "theme_color": "#your-org-color",
  "icons": [
    {
      "src": "https://your-supabase-url/storage/v1/object/public/organization-logos/org-id/logo.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    }
  ]
}
```

### 2. Test PWA Installation on Android

**Steps to test**:

1. Open customer app on Android Chrome with org parameters
2. Tap install button or use browser's "Add to Home Screen"
3. Check that the installed PWA shows:
   - Organization name as app name
   - Organization logo as app icon
   - Organization branding in splash screen

**Expected Result**:

- Home Screen icon shows organization logo instead of default Smart Queue logo
- App name shows organization name
- Organization context is preserved when launching PWA

### 3. Test Install Helper with Organization Logo

**Steps to test**:

1. Visit customer app on iOS Safari with org parameters
2. Tap the install button
3. Check that the install instructions modal shows:
   - Organization logo in header
   - Organization name in title
   - Consistent branding throughout

**Expected Result**:

- Install modal header displays organization logo next to app name
- Instructions are personalized with organization name

## Troubleshooting

### Organization Logo Not Showing

1. **Check Organization Data**:

   ```sql
   SELECT name, logo_url, primary_color FROM organizations WHERE id = 'your-org-id';
   ```

2. **Verify Logo URL**:
   - Ensure logo_url is publicly accessible
   - Check Supabase storage bucket permissions
   - Verify image format is supported (PNG, JPG, SVG)

3. **Check Manifest Generation**:
   - Visit `/api/manifest?org=your-org-id` directly
   - Verify organization data is being fetched correctly
   - Check server logs for any errors

### Caching Issues

1. **Clear Browser Cache**:
   - Hard refresh the page (Ctrl+Shift+R)
   - Clear browser cache for the site
   - Try in incognito/private mode

2. **Clear Manifest Cache**:
   - Manifest is cached for 1 hour
   - Wait or add cache-busting parameter
   - Check developer tools for manifest errors

## Implementation Notes

The organization logo enhancement provides:

✅ **Personalized PWA Icons** - Organization logo replaces generic Smart Queue logo
✅ **Brand Consistency** - Logo appears in app icon, install prompt, and shortcuts  
✅ **Dynamic Theming** - Organization colors applied to PWA theme
✅ **Professional Appearance** - Each organization gets their own branded PWA experience

This ensures that when customers install the PWA to their Home Screen, it appears as the organization's own app rather than a generic Smart Queue app.
