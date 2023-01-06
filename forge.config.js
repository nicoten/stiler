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
    // {
    //   name: "@electron-forge/maker-zip",
    //   platforms: ["darwin"],
    // },
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
};
