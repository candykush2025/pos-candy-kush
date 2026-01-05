# Secondary Screen Debug - Presentation API Test

## Overview

This is a debug interface to test the Presentation API for dual-display support in your POS system. It allows you to test communication between the main POS screen and a secondary customer-facing display.

## Features

- ✅ **API Detection**: Automatically detects if Presentation API is supported
- 🖥️ **Dual Display**: Shows different content on main and secondary screens
- 📨 **Two-Way Communication**: Send and receive messages between displays
- 🎨 **Dynamic Content**: Change background colors and display real-time data
- 📊 **Debug Logs**: Comprehensive logging for troubleshooting
- 📱 **PWA Support**: Install as a standalone app

## Access Points

### 1. Main Debug Interface

**URL**: `http://localhost:3002/secondscreen`

- Shows API support status
- Controls to start/stop secondary display
- Send test messages
- View debug logs

### 2. Secondary Display Content

**URL**: `http://localhost:3002/secondscreen/display`

- This is the content shown on the secondary screen
- Receives and displays messages from main display
- Shows connection status and real-time clock
- Different visual design to distinguish from main screen

### 3. From Login Screen

Click the **"🖥️ Secondary Screen Debug"** button at the bottom of the cashier login screen

## How to Install as PWA

### On Android:

1. Open Chrome browser
2. Navigate to `http://localhost:3002/secondscreen`
3. Tap the browser menu (⋮)
4. Select **"Add to Home Screen"** or **"Install app"**
5. Follow the prompts
6. Icon will appear on your home screen

### On Desktop:

1. Open Chrome/Edge browser
2. Navigate to `http://localhost:3002/secondscreen`
3. Look for the install icon (⊕) in the address bar
4. Click it and follow the prompts

## Testing the Presentation API

### Requirements:

- **Android**: Chrome browser + HDMI display or Chromecast
- **Desktop**: Chrome/Edge + external monitor
- **Enable Feature**: May need to enable `chrome://flags/#enable-presentation-api`

### Steps:

1. **Connect Secondary Display**:

   - HDMI cable to external monitor
   - Or setup Chromecast/Wireless display

2. **Open Debug Interface**:

   - Access `/secondscreen` on main device
   - Check that "API Support" shows ✅ Supported

3. **Start Presentation**:

   - Click **"Start Secondary Display"** button
   - Browser will prompt to select display
   - Select your secondary screen

4. **Test Communication**:

   - Click **"Send Test Message"** to send data
   - Watch messages appear on secondary screen
   - Background color should change
   - Check debug logs for activity

5. **Monitor Status**:
   - Connection state should show "connected"
   - Both displays should update in real-time
   - Debug logs show all events

## Display Differences

### Main Screen (Debug Interface):

- Blue gradient background
- Control buttons and logs
- Status cards showing connection state
- Debug console with timestamps

### Secondary Screen (Customer Display):

- Dynamic colored background (changes on messages)
- Large, customer-friendly interface
- Real-time clock
- Message history display
- "Connected" indicator

## Troubleshooting

### "Presentation API is NOT supported"

- Try Chrome browser (latest version)
- Enable `chrome://flags/#enable-presentation-api`
- Check device compatibility
- May not work in Safari or Firefox

### "No displays found"

- Ensure HDMI/external display is connected
- Check display settings in OS
- Try Chromecast if available
- Some devices only support this in kiosk mode

### Connection fails or drops

- Check network stability
- Ensure both URLs are accessible
- Look at debug logs for error messages
- Try restarting the presentation

### Different content not showing

- Verify you opened secondary display, not main debug
- Check browser console for errors
- Ensure JavaScript is enabled
- Clear browser cache and try again

## Browser Compatibility

| Browser | Desktop    | Android    | iOS   |
| ------- | ---------- | ---------- | ----- |
| Chrome  | ✅ Yes     | ✅ Yes     | ❌ No |
| Edge    | ✅ Yes     | ✅ Yes     | ❌ No |
| Firefox | ⚠️ Limited | ⚠️ Limited | ❌ No |
| Safari  | ❌ No      | N/A        | ❌ No |

## Use Cases in Production

Once working, you can use this for:

- 📺 **Customer-Facing Display**: Show prices, totals, promotional videos
- 🔐 **Payment Input**: Secure PIN entry on customer screen
- 🎬 **Video Playback**: Ads or product demos
- 📸 **Image Gallery**: Product images or store info
- 🧾 **Receipt Preview**: Show receipt before printing
- ⌨️ **Customer Input Forms**: Surveys, feedback, loyalty signup

## Files Structure

```
src/app/secondscreen/
├── page.js                 # Main debug interface
└── display/
    └── page.js            # Secondary display content

public/
└── secondscreen-manifest.json  # PWA manifest for installation
```

## Next Steps

1. **Test on Real Hardware**: Connect actual HDMI display
2. **Customize Display**: Modify `/secondscreen/display/page.js` for your needs
3. **Add Content Types**: Video player, product carousel, etc.
4. **Integrate with POS**: Connect to cart updates, payment flow
5. **Production Deployment**: Host on HTTPS (required for some features)

## Support

For issues or questions:

- Check debug logs in the interface
- Review browser console (F12)
- Test in Chrome Android first (best support)
- Verify hardware connections

---

**Note**: The Presentation API is still experimental in some browsers. For production use, consider a hybrid Android app for more reliable secondary display control.
