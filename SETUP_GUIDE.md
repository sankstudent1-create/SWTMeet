# SWTMeet - Complete Setup Guide

## 🎯 Quick Setup (5 Minutes)

### Step 1: Set Up Supabase Database

1. **Go to Supabase SQL Editor**
   - Open your Supabase project dashboard
   - Navigate to SQL Editor (left sidebar)

2. **Run the Database Schema**
   - Open `database-schema.sql` file
   - Copy all contents
   - Paste into Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter
   - Wait for success message

3. **Verify Tables Created**
   - Go to Table Editor
   - You should see these tables:
     - `users`
     - `meetings`
     - `participants`
     - `chat_messages`
     - `recordings`

### Step 2: Configure OAuth Providers (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI:
   ```
   https://pnozcdfoeoutegvszbzj.supabase.co/auth/v1/callback
   ```
6. Copy Client ID and Client Secret
7. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google
   - Paste Client ID and Secret
   - Save

#### Facebook OAuth
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app
3. Add Facebook Login product
4. Configure OAuth redirect URI:
   ```
   https://pnozcdfoeoutegvszbzj.supabase.co/auth/v1/callback
   ```
5. Copy App ID and App Secret
6. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Facebook
   - Paste App ID and Secret
   - Save

#### GitHub OAuth
1. Go to [GitHub Settings](https://github.com/settings/developers)
2. Click "New OAuth App"
3. Fill in details:
   - Application name: SWTMeet
   - Homepage URL: Your app URL
   - Authorization callback URL:
     ```
     https://pnozcdfoeoutegvszbzj.supabase.co/auth/v1/callback
     ```
4. Copy Client ID and generate Client Secret
5. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable GitHub
   - Paste Client ID and Secret
   - Save

### Step 3: Run the Application

**Option 1: Using Python**
```bash
cd SWTMeet
python -m http.server 8000
```

**Option 2: Using Node.js**
```bash
cd SWTMeet
npx http-server -p 8000
```

**Option 3: Using PHP**
```bash
cd SWTMeet
php -S localhost:8000
```

**Option 4: Using VS Code Live Server**
- Install "Live Server" extension
- Right-click on `index.html`
- Select "Open with Live Server"

### Step 4: Test the Application

1. **Open in Browser**
   ```
   http://localhost:8000/index.html
   ```

2. **Test Guest Access**
   - Try entering a random meeting code
   - Should show "Meeting not found" (expected)

3. **Create an Account**
   - Click "Sign Up Free" or go to `auth.html`
   - Create account with email/password or OAuth
   - Verify email if using email/password

4. **Create Your First Meeting**
   - After login, you'll see the dashboard
   - Click "Create Meeting"
   - Fill in meeting details
   - Click "Create Meeting"
   - Choose to start now or later

5. **Test Meeting Join**
   - Click "Join Now" on your meeting
   - Allow camera/microphone permissions
   - You should see yourself in the meeting

## 🔧 Configuration

### Supabase Configuration

The configuration is already set in `config/supabase.js`:

```javascript
const SUPABASE_URL = 'https://pnozcdfoeoutegvszbzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

**To use your own Supabase project:**
1. Create a new Supabase project
2. Get your project URL and anon key from Settings > API
3. Update `config/supabase.js` with your credentials
4. Run the database schema in your project

### Logo Customization

Replace `SWTlogo.jpg` with your own logo:
- Recommended size: 500x500px or larger
- Format: JPG, PNG, or SVG
- Keep the filename as `SWTlogo.jpg` or update references in HTML files

### Color Theme

Edit CSS variables in `style.css`:

```css
:root {
    --color-primary: #E6007E;      /* Main brand color */
    --color-secondary: #F37B23;    /* Secondary accent */
    --color-tertiary: #00AEEF;     /* Tertiary accent */
    --color-dark-blue: #2A2F67;    /* Dark text color */
}
```

## 📱 Testing Checklist

### Authentication Tests
- [ ] Sign up with email/password
- [ ] Sign in with email/password
- [ ] Sign up with Google OAuth
- [ ] Sign up with Facebook OAuth
- [ ] Sign up with GitHub OAuth
- [ ] Sign out
- [ ] Password reset (if implemented)

### Meeting Management Tests
- [ ] Create instant meeting
- [ ] Create scheduled meeting
- [ ] Create meeting with password
- [ ] Create meeting with waiting room
- [ ] View upcoming meetings
- [ ] View active meetings
- [ ] View past meetings
- [ ] Copy meeting link
- [ ] Join own meeting as host

### Meeting Room Tests
- [ ] Join meeting with valid code
- [ ] Join meeting as guest
- [ ] Camera turns on
- [ ] Microphone works
- [ ] Mute/unmute audio
- [ ] Start/stop video
- [ ] View participants list
- [ ] Send chat message
- [ ] Leave meeting

### Host Controls Tests
- [ ] Admit participant from waiting room
- [ ] Deny participant from waiting room
- [ ] Mute all participants
- [ ] Remove participant
- [ ] Lock meeting
- [ ] End meeting for all

### Real-time Features Tests
- [ ] Participant joins (updates in real-time)
- [ ] Participant leaves (updates in real-time)
- [ ] Meeting status changes
- [ ] Chat messages appear instantly

## 🐛 Common Issues & Solutions

### Issue: "Supabase services not loaded"
**Solution:**
- Ensure `config/supabase.js` is loaded before other scripts
- Check browser console for errors
- Verify Supabase CDN is accessible

### Issue: "Meeting not found"
**Solution:**
- Check if meeting ID is correct
- Verify meeting exists in database
- Check database RLS policies
- Ensure user has permission to view meeting

### Issue: Camera/Microphone not working
**Solution:**
- Grant browser permissions
- Use HTTPS or localhost (required for WebRTC)
- Check if devices are not in use by another app
- Try different browser (Chrome/Edge recommended)

### Issue: OAuth not working
**Solution:**
- Verify OAuth credentials in Supabase
- Check redirect URIs match exactly
- Ensure provider is enabled in Supabase
- Clear browser cache and cookies

### Issue: Database errors
**Solution:**
- Check Supabase connection status
- Verify RLS policies are set correctly
- Check API keys are valid
- Review SQL schema execution logs

### Issue: Real-time updates not working
**Solution:**
- Check Supabase Realtime is enabled
- Verify subscription code is correct
- Check browser console for errors
- Ensure database triggers are set up

## 🚀 Deployment

### Deploy to Netlify

1. **Prepare for deployment**
   ```bash
   # No build step needed - static files only
   ```

2. **Deploy**
   - Go to [Netlify](https://netlify.com)
   - Drag and drop the `SWTMeet` folder
   - Or connect GitHub repository
   - Site will be live in seconds

3. **Configure**
   - Set custom domain (optional)
   - Enable HTTPS (automatic)
   - Update OAuth redirect URIs to your domain

### Deploy to Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   cd SWTMeet
   vercel
   ```

3. **Follow prompts**
   - Link to existing project or create new
   - Site will be deployed

### Deploy to GitHub Pages

1. **Create repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_REPO_URL
   git push -u origin main
   ```

2. **Enable GitHub Pages**
   - Go to repository Settings
   - Scroll to GitHub Pages
   - Select branch: main
   - Select folder: / (root)
   - Save

3. **Access site**
   ```
   https://YOUR_USERNAME.github.io/REPO_NAME/
   ```

### Update OAuth Redirect URIs

After deployment, update redirect URIs in:
- Supabase Dashboard (Authentication > URL Configuration)
- Google Cloud Console
- Facebook Developers
- GitHub OAuth Apps

Add your production URL:
```
https://your-domain.com
```

## 📊 Database Management

### View Data

**Using Supabase Dashboard:**
1. Go to Table Editor
2. Select table (users, meetings, participants, etc.)
3. View, edit, or delete records

**Using SQL Editor:**
```sql
-- View all meetings
SELECT * FROM meetings;

-- View all participants
SELECT * FROM participants;

-- View meetings with host info
SELECT m.*, u.full_name as host_name
FROM meetings m
JOIN users u ON m.host_id = u.id;
```

### Backup Database

**Using Supabase CLI:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref pnozcdfoeoutegvszbzj

# Dump database
supabase db dump -f backup.sql
```

### Reset Database

**To start fresh:**
1. Go to SQL Editor
2. Run:
   ```sql
   DROP TABLE IF EXISTS recordings CASCADE;
   DROP TABLE IF EXISTS chat_messages CASCADE;
   DROP TABLE IF EXISTS participants CASCADE;
   DROP TABLE IF EXISTS meetings CASCADE;
   DROP TABLE IF EXISTS users CASCADE;
   ```
3. Re-run `database-schema.sql`

## 🔐 Security Best Practices

### For Production

1. **Enable Email Verification**
   - Supabase Dashboard > Authentication > Settings
   - Enable "Confirm email"

2. **Set Up Rate Limiting**
   - Supabase Dashboard > Authentication > Settings
   - Configure rate limits for auth endpoints

3. **Review RLS Policies**
   - Ensure policies are restrictive
   - Test with different user roles
   - Audit access logs

4. **Secure API Keys**
   - Never commit keys to version control
   - Use environment variables
   - Rotate keys periodically

5. **Enable HTTPS**
   - Required for WebRTC
   - Use SSL certificates
   - Redirect HTTP to HTTPS

6. **Add CORS Configuration**
   - Restrict allowed origins
   - Configure in Supabase settings

## 📈 Monitoring

### Check Application Health

1. **Supabase Dashboard**
   - Monitor database usage
   - Check API requests
   - Review error logs

2. **Browser Console**
   - Check for JavaScript errors
   - Monitor network requests
   - Review WebRTC connection status

3. **User Feedback**
   - Collect user reports
   - Monitor meeting quality
   - Track feature usage

## 🎓 Learning Resources

### Supabase
- [Official Documentation](https://supabase.com/docs)
- [Authentication Guide](https://supabase.com/docs/guides/auth)
- [Realtime Guide](https://supabase.com/docs/guides/realtime)

### WebRTC
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebRTC for Beginners](https://webrtc.org/getting-started/overview)

### JavaScript
- [Modern JavaScript](https://javascript.info/)
- [Async/Await](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await)

## ✅ Production Readiness Checklist

Before going live:

- [ ] Database schema deployed
- [ ] RLS policies tested
- [ ] OAuth providers configured
- [ ] Email verification enabled
- [ ] Rate limiting configured
- [ ] HTTPS enabled
- [ ] Custom domain set up
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Responsive design tested
- [ ] Cross-browser testing done
- [ ] Performance optimized
- [ ] Security audit completed
- [ ] Backup strategy in place
- [ ] Monitoring set up
- [ ] Documentation updated

## 🆘 Getting Help

If you encounter issues:

1. Check this guide's troubleshooting section
2. Review browser console for errors
3. Check Supabase dashboard for database errors
4. Verify all setup steps were completed
5. Test with a fresh browser/incognito mode
6. Check network connectivity

---

**Ready to start? Follow Step 1 above! 🚀**
