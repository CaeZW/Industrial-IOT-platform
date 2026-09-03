module.exports = {
  uiPort: 1880,
  uiHost: "0.0.0.0",

  adminAuth: {
    type: "credentials",
    users: [
      {
        username: process.env.NODERED_USERNAME,
        password: process.env.NODERED_PASSWORD_HASH,
        permissions: "*",
      },
    ],
  },
};
