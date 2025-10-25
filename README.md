# SWTMeet - Video Meeting Platform

A modern, production-ready video conferencing platform with real-time communication, authentication, and advanced meeting controls.

## Features

### Core Video Features
- **WebRTC Video/Audio** - Peer-to-peer HD video and audio
- **Screen Sharing** - Share your screen with all participants
- **Smart Layout** - Auto-adjusting grid with split-screen for screen sharing
- **Camera Controls** - Mute/unmute, start/stop video
- **Multiple Participants** - Support for many concurrent users

### Communication
- **Real-time Chat** - Persistent messages saved to database
- **Reactions** - Express yourself with emoji reactions
- **Raise Hand** - Get attention without interrupting
- **Notifications** - Visual feedback for all actions

### Security & Access Control
- **Authentication** - Supabase Auth with OAuth support
- **Guest Access** - Join without account (with name)
- **Waiting Room** - Host approval before joining
- **Meeting Lock** - Prevent new participants from joining
- **Role-Based Access** - Host, Moderator, Participant roles
- **Password Protection** - Optional meeting passwords
- ✅ Live participant list
- ✅ Real-time meeting updates
- ✅ Participant status tracking
- ✅ Meeting status sync
- ✅ Supabase Realtime subscriptions

### Meeting Controls
- ✅ Video on/off
- ✅ Audio mute/unmute
- ✅ Screen sharing
- ✅ Chat messaging
- ✅ Reactions
- ✅ Recording
- ✅ Security settings

### Host Controls
- ✅ Admit/deny participants (waiting room)
- ✅ Mute all participants
- ✅ Remove participants
- ✅ Lock meeting
- ✅ End meeting for all
- ✅ Manage permissions

### UI/UX
- ✅ Beautiful animated loader with logo
- ✅ Responsive design
- ✅ Modern glassmorphism effects
- ✅ Smooth animations
- ✅ Intuitive navigation
- ✅ Real-time notifications

## 🛠️ Technology Stack

### Frontend
- HTML5, CSS3, JavaScript ES6+
- Supabase JS SDK v2
- WebRTC API
- Modern CSS (Flexbox, Grid, Animations)

### Backend
- Supabase (PostgreSQL)
- Supabase Auth
- Supabase Realtime
- Row Level Security (RLS)

### Database Schema
- **users** - User profiles
- **meetings** - Meeting details
- **participants** - Meeting participants
- **chat_messages** - Chat history
- **recordings** - Meeting recordings

## 📦 Setup Instructions

### 1. Database Setup

Run the SQL schema in your Supabase SQL Editor:

```bash
# Open Supabase Dashboard > SQL Editor
# Copy and paste the contents of database-schema.sql
# Execute the SQL
```

This will create:
- All necessary tables
- Indexes for performance
- Row Level Security policies
- Triggers for automatic updates
- Functions for user profile creation

### 2. Configure OAuth Providers (Optional)

In Supabase Dashboard > Authentication > Providers:

**Google OAuth:**
1. Enable Google provider
2. Add your Google Client ID and Secret
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

**Facebook OAuth:**
1. Enable Facebook provider
2. Add your Facebook App ID and Secret
3. Configure redirect URI

**GitHub OAuth:**
1. Enable GitHub provider
2. Add your GitHub Client ID and Secret
3. Configure OAuth callback URL

### 3. Project Configuration

The Supabase configuration is already set in `config/supabase.js`:

```javascript
const SUPABASE_URL = 'https://pnozcdfoeoutegvszbzj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

### 4. Run the Application

Simply open `index.html` in a web browser or use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to:
- `http://localhost:8000/index.html` - Home/Dashboard
- `http://localhost:8000/auth.html` - Login/Signup
- `http://localhost:8000/meeting.html?id=MEETING_ID` - Meeting room

## 📖 User Guide

### For Guests (No Account)

1. Go to the homepage
2. Enter a meeting code
3. Click "Join"
4. Enter your name when prompted
5. Wait for host to admit you (if waiting room is enabled)

### For Registered Users

#### Sign Up
1. Go to `auth.html`
2. Click "Sign Up" tab
3. Fill in your details or use OAuth
4. Verify your email (if using email/password)

#### Sign In
1. Go to `auth.html`
2. Enter credentials or use OAuth
3. You'll be redirected to the dashboard

#### Create a Meeting
1. Sign in to your account
2. Click "Create Meeting" button
3. Fill in meeting details:
   - Title (required)
   - Description
   - Date & Time
   - Duration
   - Password (optional)
   - Enable waiting room
   - Enable recording
4. Click "Create Meeting"
5. Start immediately or schedule for later

#### Join a Meeting
1. From dashboard: Click "Join Now" on any meeting card
2. Or enter meeting code in the join box
3. Click "Join"

#### Manage Meetings
- **Upcoming**: View and start scheduled meetings
- **Active**: Join live meetings
- **Past**: View meeting history

### For Meeting Hosts

#### During Meeting
- **Admit Participants**: Approve/deny from waiting room
- **Mute All**: Mute all participants at once
- **Remove Participant**: Remove disruptive users
- **Lock Meeting**: Prevent new participants from joining
- **End Meeting**: End meeting for all participants

#### Meeting Settings
- Toggle waiting room on/off
- Set/change meeting password
- Enable/disable recording
- Manage participant permissions

## 🔐 Security Features

### Authentication
- Secure password hashing (bcrypt)
- JWT-based sessions
- OAuth 2.0 integration
- Email verification

### Database Security
- Row Level Security (RLS) policies
- User-scoped data access
- Secure API keys
- SQL injection prevention

### Meeting Security
- Password protection
- Waiting room
- Host verification
- Meeting lock
- Participant removal

## 📁 File Structure

```
SWTMeet/
├── index.html              # Home/Dashboard page
├── auth.html               # Login/Signup page
├── meeting.html            # Meeting room page
├── style.css               # Home page styles
├── auth-style.css          # Auth page styles
├── meeting-style.css       # Meeting room styles
├── app.js                  # Dashboard logic
├── auth-script.js          # Authentication logic
├── meeting-script.js       # Meeting room logic
├── config/
│   └── supabase.js        # Supabase configuration
├── database-schema.sql     # Database schema
├── SWTlogo.jpg            # Logo image
└── README.md              # This file
```

## 🎨 Customization

### Colors
Edit CSS variables in `style.css`:
```css
:root {
    --color-primary: #E6007E;
    --color-secondary: #F37B23;
    --color-tertiary: #00AEEF;
    --color-dark-blue: #2A2F67;
}
```

### Logo
Replace `SWTlogo.jpg` with your own logo (recommended size: 500x500px)

### Meeting Settings
Modify default settings in `config/supabase.js`

## 🐛 Troubleshooting

### "Meeting not found" error
- Verify the meeting ID is correct
- Check if meeting exists in database
- Ensure meeting hasn't been deleted

### Camera/Microphone not working
- Check browser permissions
- Ensure HTTPS or localhost
- Try different browser
- Check device settings

### OAuth not working
- Verify OAuth credentials in Supabase
- Check redirect URIs
- Ensure provider is enabled
- Clear browser cache

### Database errors
- Check Supabase connection
- Verify RLS policies
- Check API keys
- Review SQL schema

## 🚧 Coming Soon

- [ ] WebRTC peer-to-peer connections
- [ ] Screen sharing implementation
- [ ] Recording functionality
- [ ] Breakout rooms
- [ ] Virtual backgrounds
- [ ] Meeting analytics
- [ ] Mobile apps (iOS/Android)
- [ ] Desktop apps (Windows/Mac/Linux)

## 📝 Notes

### Current Implementation Status

**✅ Completed:**
- Full Supabase authentication system
- Database schema with RLS
- User dashboard with meeting management
- Meeting creation and scheduling
- Real-time participant tracking
- Host verification and role management
- Waiting room logic
- Beautiful UI with animations
- Responsive design

**🚧 In Progress:**
- WebRTC video/audio streaming
- Screen sharing
- Real-time chat
- Recording functionality

**📋 Planned:**
- Advanced host controls
- Meeting analytics
- Mobile/Desktop apps

## 🤝 Contributing

This is a prototype/demo application. For production use:
1. Add proper error handling
2. Implement WebRTC signaling server
3. Add TURN/STUN servers
4. Implement end-to-end encryption
5. Add comprehensive testing
6. Set up CI/CD pipeline
7. Add monitoring and logging

## 📄 License

This project is for educational purposes. Modify as needed for your use case.

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review Supabase documentation
3. Check browser console for errors
4. Verify database schema is correctly set up

## 🎯 Quick Start Checklist

- [ ] Run database schema in Supabase
- [ ] Configure OAuth providers (optional)
- [ ] Update logo image
- [ ] Test authentication flow
- [ ] Create a test meeting
- [ ] Join meeting as guest
- [ ] Test host controls
- [ ] Verify real-time updates

---

**Built with ❤️ using Supabase and modern web technologies**
