/** @type {import('@bacons/apple-targets').Config} */
module.exports = {
  type: 'share',
  icon: '../../assets/icon.png',
  entitlements: {
    'com.apple.security.application-groups': ['group.com.shoasano.scheduleapp'],
  },
  deploymentTarget: '17.0',
};
