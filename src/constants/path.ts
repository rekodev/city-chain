export const PATH = {
  root: '/',
  signIn: '/signin',
  singUp: '/signup',
  verifyEmail: '/verify-email',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  history: '/history',
  play: {
    index: '/play',
    bots: '/play/bots',
    friend: '/play/friend',
    local: '/play/local',
    practice: '/play/practice',
    online: '/play/online'
  }
} as const;
