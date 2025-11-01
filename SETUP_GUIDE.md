# Quick Setup Guide: GitHub Data Sync

## ⚡ Fast Track Setup (5 minutes)

### Step 1: Create GitHub Personal Access Token

1. Go to https://github.com/settings/tokens/new
2. Token name: `FITREP Data Sync`
3. Expiration: Choose your preference (90 days recommended)
4. Select scopes:
   - ✅ **repo** (full control of private repositories)
5. Click "Generate token"
6. **Copy the token immediately** (you won't see it again!)

### Step 2: Configure in Application

1. Open the FITREP Evaluator application
2. If logged into RS Dashboard:
   - Click **"🔗 Connect GitHub"** button
3. If not yet logged in:
   - Log in to your RS profile first
   - Then click **"⚙️ GitHub Settings"** in the dashboard

4. Paste your token in the configuration modal
5. Click **"💾 Save & Test Connection"**
6. Wait for success message: ✅ Successfully connected to GitHub!

### Step 3: Verify It's Working

1. Create or open an evaluation
2. Complete the evaluation
3. Click **"Save to Profile"**
4. Check the "Sync to GitHub when online" checkbox
5. Save the evaluation
6. Check your repository: https://github.com/SemperAdmin/Fitness-Report-Evaluator-Data
7. You should see a new file: `users/[your_email_prefix].json`

---

## 📋 Detailed Instructions

### Creating the GitHub Token

**Why do I need this?**
- The application needs permission to write to your private GitHub repository
- The token acts like a password for the application

**Steps:**

1. **Navigate to Token Settings**
   ```
   https://github.com/settings/tokens/new
   ```

2. **Configure Token**
   - Note: `FITREP Data Sync`
   - Expiration: `90 days` (or your preference)
   - Scopes: Check **repo** (this is the only required scope)

3. **Generate and Copy**
   - Click "Generate token"
   - Copy the token (starts with `ghp_`)
   - Save it temporarily in a secure location

### Configuring the Application

**Option 1: Through Dashboard**

1. Log in to your RS Dashboard
2. Look for the GitHub button in the top action bar
3. Click "🔗 Connect GitHub" or "⚙️ GitHub Settings"
4. Paste your token
5. Click "Save & Test Connection"

**Option 2: Browser Console (Advanced)**

```javascript
// Open browser console (F12)
githubService.storeToken('ghp_your_token_here');
await githubService.verifyConnection();
// Should return: true
```

### Verifying the Setup

**Check 1: Application Status**
- Connection status indicator should show: "Online - GitHub sync enabled"
- Status dot should be green

**Check 2: Test Save**
- Save an evaluation
- Check console (F12) for success messages:
  ```
  ✓ Using GitHub token from localStorage
  ✓ GitHub sync available
  Evaluation synced to GitHub: Profile updated successfully
  ```

**Check 3: GitHub Repository**
- Visit: https://github.com/SemperAdmin/Fitness-Report-Evaluator-Data
- Navigate to `users/` folder
- You should see your data file: `[email_prefix].json`

---

## 🔒 Security Considerations

### ⚠️ Important Security Notes

1. **Token Storage**
   - Token is stored in browser localStorage
   - Only visible on your device/browser
   - Not transmitted to any server except GitHub

2. **Device Security**
   - Only configure on your personal device
   - Do not use on shared computers
   - Clear token before allowing others to use device

3. **Token Permissions**
   - Token has write access to your private repositories
   - Treat it like a password
   - Never share your token with anyone

4. **Production Deployment**
   - This setup is for **single-user/development only**
   - For multi-user production, use backend proxy (see GITHUB_INTEGRATION.md)

### 🔐 Best Practices

✅ **DO:**
- Use token expiration (90 days recommended)
- Create token with minimal required scopes (repo only)
- Clear token when changing devices
- Regenerate token periodically

❌ **DON'T:**
- Share your token with anyone
- Use on public/shared computers
- Commit token to version control
- Deploy publicly with token in localStorage

---

## 🛠️ Troubleshooting

### Issue: "Failed to load resource: 404" for /api/github-token

**Cause:** No backend server running (this is expected)

**Solution:** Configure token through UI (this is the alternative to backend server)

### Issue: "Invalid token format"

**Cause:** Token doesn't start with `ghp_`

**Solution:**
- Classic tokens start with `ghp_`
- Fine-grained tokens start with `github_pat_`
- Use classic tokens for now
- If using fine-grained, update validation in code

### Issue: "Connection failed"

**Possible causes:**
1. **Wrong repository permissions**
   - Token needs `repo` scope
   - Must have access to `SemperAdmin/Fitness-Report-Evaluator-Data`

2. **Repository doesn't exist**
   - Create the repository first
   - Must be private
   - Owned by `SemperAdmin`

3. **Network issue**
   - Check internet connection
   - Check firewall settings
   - Try again in a few moments

### Issue: "Data not appearing in GitHub"

**Check:**
1. Token configured correctly
2. "Sync to GitHub" checkbox enabled when saving
3. Console shows sync success message
4. Repository exists and you have access

**Console Messages to Look For:**
```
✓ Using GitHub token from localStorage
✓ GitHub sync available
Evaluation synced to GitHub: Profile updated successfully
```

### Issue: "GitHub service not initialized"

**Cause:** Token not configured or invalid

**Solution:**
1. Open GitHub Settings modal
2. Re-enter token
3. Save and test connection
4. Refresh page if needed

---

## 📊 Data Sync Behavior

### When Data is Synced

**Automatic Sync Triggers:**
- Saving evaluation with "Sync to GitHub" checked
- Clicking "Sync to GitHub" button in dashboard
- Closing evaluations with sync enabled

**Manual Sync:**
- Dashboard: Click "🔄 Sync to GitHub" button
- Syncs all evaluations at once

### Data Flow

```
Evaluation Completed
       ↓
Save to Profile (with GitHub sync enabled)
       ↓
Saved to localStorage (always)
       ↓
Uploaded to GitHub (if online & configured)
       ↓
File created/updated: users/[email_prefix].json
```

### Sync Status Indicators

- **Synced:** ✅ Green checkmark, "synced" status
- **Pending:** ⏳ Orange clock, "pending" status
- **Failed:** ❌ Red X, "failed" status
- **Offline:** 💾 Gray disk, saved locally only

---

## 🔄 Advanced: Backend Proxy Setup

For production multi-user deployments, use the backend proxy instead of localStorage tokens.

See: [GITHUB_INTEGRATION.md](GITHUB_INTEGRATION.md) for full backend setup instructions.

**Quick Start:**

```bash
# Install dependencies
npm install express express-session dotenv cors

# Create .env file
cp .env.example .env
# Edit .env and add your FITREP_DATA token

# Start server
node server-example.js

# Application will automatically use backend if available
```

---

## 📞 Support

### Getting Help

1. Check console (F12) for error messages
2. Review this guide's troubleshooting section
3. Check GITHUB_INTEGRATION.md for detailed documentation
4. Report issues at: https://github.com/SemperAdmin/Fitness-Report-Evaluator/issues

### Common Questions

**Q: Is my data secure?**
A: Yes. Data is stored in your private GitHub repository. Only you have access.

**Q: Can others see my token?**
A: No, unless they have physical access to your device/browser.

**Q: What happens if I lose my token?**
A: Generate a new one. Old token will stop working. Update in application.

**Q: Do I need to stay online?**
A: No. Data saves locally first. Syncs to GitHub when online.

**Q: Can I use this on multiple devices?**
A: Yes. Configure token on each device. Data syncs via GitHub.

---

## ✅ Checklist

Before using GitHub sync:

- [ ] Created GitHub Personal Access Token with `repo` scope
- [ ] Configured token in application
- [ ] Verified connection (green status)
- [ ] Tested with sample evaluation
- [ ] Confirmed file appears in GitHub repository
- [ ] Understand security implications
- [ ] Using personal device only

---

**Setup complete! Your evaluations will now sync to GitHub automatically.** 🎉
