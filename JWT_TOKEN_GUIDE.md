# JWT Token Configuration Guide

## How to Set Longer-Lasting JWT Tokens

### Option 1: Update Environment Variable (Recommended)

1. **Edit the `.env` file** in the `backend/` directory:
   ```bash
   cd backend
   nano .env  # or use your preferred editor
   ```

2. **Add or update the `JWT_EXPIRES_IN` variable:**
   ```env
   JWT_EXPIRES_IN=30d
   ```

3. **Available time formats:**
   - `24h` - 24 hours (1 day)
   - `7d` - 7 days (default)
   - `30d` - 30 days
   - `90d` - 90 days
   - `365d` - 1 year
   - `9999d` - For development/testing (essentially never expires)

4. **Restart the backend server:**
   ```bash
   cd backend
   npm start
   ```

### Option 2: Quick Update via Terminal

Run this command to set a 30-day expiration:
```bash
cd backend
echo "JWT_EXPIRES_IN=30d" >> .env
```

Or for 1 year:
```bash
cd backend
echo "JWT_EXPIRES_IN=365d" >> .env
```

### How to Regenerate a Token

**After updating the expiration time, you need to log in again to get a new token:**

1. **Log out** from the application (or clear localStorage)
2. **Log in again** - the new token will have the updated expiration time
3. The new token will last for the duration specified in `JWT_EXPIRES_IN`

### Current Configuration

- **Default expiration:** 7 days (`7d`)
- **Previous default:** 24 hours (`24h`)
- **Location:** `backend/src/middleware/auth.js`

### Example .env Configuration

```env
# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRES_IN=30d  # 30 days
```

### Important Notes

⚠️ **Security Considerations:**
- Longer token expiration means if a token is compromised, it remains valid longer
- For production, consider shorter expiration times (7-30 days)
- For development, you can use longer times (90-365 days) or even `9999d`

✅ **Best Practices:**
- Use `7d` to `30d` for production
- Use `365d` or `9999d` only for development/testing
- Always use a strong `JWT_SECRET` in production

### Troubleshooting

**Token still expires quickly?**
- Make sure you restarted the backend server after changing `.env`
- Clear your browser's localStorage and log in again
- Check that `JWT_EXPIRES_IN` is correctly set in `.env`

**Check current token expiration:**
- The token expiration is set when it's generated (during login)
- Old tokens won't be affected by new settings
- You must log in again to get a new token with the updated expiration

