module.exports = {
  packagerConfig: {
    osxSign: {
      identity: "Developer ID Application: Nicolas Tejera Aguirre (Q7W884XZ8U)",
      "hardened-runtime": true,
      entitlements: "static/entitlements.plist",
      "entitlements-inherit": "static/entitlements.plist",
      "signature-flags": "library",
    },
    osxNotarize: {
      tool: "notarytool",
      appleId: process.env.APIDU,
      appleIdPassword: process.env.APIDP,
      teamId: process.env.APIDT,
    },
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-dmg',
      config: {}
    }, 
    {
      name: "@electron-forge/maker-squirrel",
      config: {},
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: {},
    },
    {
      name: "@electron-forge/maker-rpm",
      config: {},
    },
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "nicoten",
          name: "stiler",
        },
        prerelease: false,
      },
    },
  ],
  plugins: [{
    name: "@electron-forge/plugin-webpack",
    config: {
      "mainConfig": "./webpack.main.config.js",
      "devContentSecurityPolicy": "default-src * self blob: data: gap:; style-src * self 'unsafe-inline' blob: data: gap:; script-src * 'self' 'unsafe-eval' 'unsafe-inline' blob: data: gap:; object-src * 'self' blob: data: gap:; img-src * self 'unsafe-inline' blob: data: gap:; connect-src self * 'unsafe-inline' blob: data: gap:; frame-src * self blob: data: gap:;",
      "renderer": {
        "config": "./webpack.renderer.config.js",
        "entryPoints": [
          {
            "html": "./src/index.html",
            "js": "./src/renderer.js",
            "name": "main_window",
            "preload": {
              "js": "./src/server/api.js"
            }
          }
        ]
      }
    }
  }]
};
